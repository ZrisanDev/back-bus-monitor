import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RouteStop } from '../route-stops/entities/route-stop.entity';
import { KafkaProducerService } from './kafka-producer.service';

export interface BusSimulationState {
  routeId: number;
  currentStopIndex: number;
  coordIndex: number;
  segmentCoordinates: [number, number][] | null;
  passengerCount: number;
  phase: 'MOVING' | 'STOPPED';
  stoppedSince: Date | null;
  status: string;
}

@Injectable()
export class SimulatorService {
  private readonly logger = new Logger(SimulatorService.name);
  private running = false;
  private interval: NodeJS.Timeout | null = null;
  private readonly tickSeconds = 5;
  private readonly busStates = new Map<number, BusSimulationState>();
  private static readonly ARRIVING_THRESHOLD = 3;

  constructor(
    private readonly kafkaProducer: KafkaProducerService,
    @Inject('IBusAssignmentsService')
    private readonly busAssignmentsService: any,
    @Inject('IBusesService')
    private readonly busesService: any,
    @InjectRepository(RouteStop)
    private readonly routeStopRepository: Repository<RouteStop>,
  ) {}

  async start(): Promise<{ status: string; tick_seconds: number }> {
    if (this.running) {
      this.logger.warn('Simulation already running — ignoring duplicate start');
      return { status: 'running', tick_seconds: this.tickSeconds };
    }

    this.running = true;
    this.interval = setInterval(() => {
      this.tick().catch((err) =>
        this.logger.error('Tick error', err?.message ?? err),
      );
    }, this.tickSeconds * 1000);

    this.logger.log('Simulation started');
    return { status: 'running', tick_seconds: this.tickSeconds };
  }

  async stop(): Promise<{ status: string }> {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.running = false;
    this.busStates.clear();
    this.logger.log('Simulation stopped');
    return { status: 'stopped' };
  }

  isRunning(): boolean {
    return this.running;
  }

  async tick(): Promise<void> {
    const buses: any[] = await this.busesService.findAll();

    for (const bus of buses) {
      const assignment: any | null =
        await this.busAssignmentsService.findActiveByBusId(bus.id);

      if (!assignment) {
        this.logger.warn(
          `Bus ${bus.id} has no active assignment — skipping`,
        );
        continue;
      }

      const routeStops = await this.routeStopRepository.find({
        where: { route_id: assignment.route_id },
        relations: ['stop'],
        order: { stop_order: 'ASC' },
      });

      if (routeStops.length === 0) {
        this.logger.warn(
          `Route ${assignment.route_id} has no stops — skipping bus ${bus.id}`,
        );
        continue;
      }

      // Get or initialize bus state
      // Normalize IDs to number — pg driver may return BigInt as strings,
      // causing strict !== comparisons to fail and re-initialize state every tick.
      const busKey = Number(bus.id);
      let state = this.busStates.get(busKey);
      const routeId = Number(assignment.route_id);

      if (!state || state.routeId !== routeId) {
        const firstSegment = SimulatorService.extractSegmentCoords(routeStops[0]);
        state = {
          routeId,
          currentStopIndex: 0,
          coordIndex: 0,
          segmentCoordinates: firstSegment,
          passengerCount: state?.passengerCount ?? 0,
          phase: 'STOPPED',
          stoppedSince: new Date(),
          status: '',
        };
        this.busStates.set(busKey, state);
      }

      // Resolve stop context for status computation
      const currentStop = routeStops[state.currentStopIndex];
      const nextStopIndex = SimulatorService.advanceToNextStop(state.currentStopIndex, routeStops.length);
      const isAtLastStop = state.currentStopIndex === routeStops.length - 1;
      const currentStopName = currentStop.stop.name;
      const nextStopName = isAtLastStop ? null : routeStops[nextStopIndex].stop.name;

      if (state.phase === 'MOVING') {
        await this.handleMovingPhase(state, bus, assignment, routeStops, currentStop, currentStopName, nextStopName);
      } else {
        await this.handleStoppedPhase(state, bus, assignment, routeStops, currentStop, currentStopName, nextStopName);
      }
    }
  }

  /**
   * Handle MOVING phase: advance along segment, publish telemetry,
   * transition to STOPPED when segment exhausted.
   * Produces exactly 1 publish per tick.
   */
  private async handleMovingPhase(
    state: BusSimulationState,
    bus: any,
    assignment: any,
    routeStops: any[],
    currentStop: any,
    currentStopName: string,
    nextStopName: string | null,
  ): Promise<void> {
    const segLen = state.segmentCoordinates?.length ?? 0;

    if (segLen === 0) {
      // No segment geometry — use legacy behavior (cycle stops immediately, no STOPPED phase)
      const coord = SimulatorService.getCurrentCoordinate(
        null, 0, currentStop,
      );

      const status = 'En camino a ' + (nextStopName ?? currentStopName);
      state.status = status;

      await this.publishTelemetry(
        bus.id, assignment.route_id, currentStop.stop.id,
        coord.latitude, coord.longitude, state.passengerCount,
        status, currentStopName, nextStopName,
      );

      // Advance to next stop directly (no STOPPED phase)
      const transition = SimulatorService.advancePosition(
        state.coordIndex,
        state.segmentCoordinates,
        state.currentStopIndex,
        routeStops,
      );
      state.coordIndex = transition.coordIndex;
      state.currentStopIndex = transition.currentStopIndex;
      state.segmentCoordinates = transition.segmentCoordinates;
      return;
    }

    // Check if this is the last point of the segment → arrival at stop
    if (state.coordIndex >= segLen - 1) {
      // ARRIVAL: transition to STOPPED, publish arrival event
      state.phase = 'STOPPED';
      state.stoppedSince = new Date();

      // Advance currentStopIndex to the stop we just arrived at
      const arrivedIdx = SimulatorService.advanceToNextStop(
        state.currentStopIndex,
        routeStops.length,
      );
      state.currentStopIndex = arrivedIdx;

      const arrivedStop = routeStops[arrivedIdx];
      const arrivedStopName = arrivedStop.stop.name;
      const isNowAtLast = arrivedIdx === routeStops.length - 1;
      const arrivedNextStop = isNowAtLast ? null : routeStops[SimulatorService.advanceToNextStop(arrivedIdx, routeStops.length)].stop.name;

      state.status = `En ${arrivedStopName}`;

      await this.publishTelemetry(
        bus.id, assignment.route_id, arrivedStop.stop.id,
        Number(arrivedStop.stop.latitude), Number(arrivedStop.stop.longitude),
        state.passengerCount, state.status, arrivedStopName, arrivedNextStop,
      );
    } else {
      // Normal MOVING: publish current segment point, advance coordIndex
      const coord = SimulatorService.getCurrentCoordinate(
        state.segmentCoordinates,
        state.coordIndex,
        currentStop,
      );

      const status = SimulatorService.resolveStatus(
        'MOVING',
        state.coordIndex,
        segLen,
        currentStopName,
        nextStopName,
        false,
      );
      state.status = status;

      await this.publishTelemetry(
        bus.id, assignment.route_id, currentStop.stop.id,
        coord.latitude, coord.longitude, state.passengerCount,
        status, currentStopName, nextStopName,
      );

      state.coordIndex++;
    }
  }

  /**
   * Handle STOPPED phase: dwell at stop, apply passenger variation,
   * transition to MOVING when 60s elapsed.
   * Produces exactly 1 publish per tick.
   */
  private async handleStoppedPhase(
    state: BusSimulationState,
    bus: any,
    assignment: any,
    routeStops: any[],
    currentStop: any,
    currentStopName: string,
    nextStopName: string | null,
  ): Promise<void> {
    const now = new Date();

    if (SimulatorService.shouldTransitionToMoving(state.stoppedSince, now)) {
      // DEPARTURE: transition to MOVING
      state.phase = 'MOVING';
      state.stoppedSince = null;

      const isAtLast = state.currentStopIndex === routeStops.length - 1;

      if (isAtLast) {
        // Circular wrap: reset to first stop
        state.currentStopIndex = 0;
      }

      // Load next segment at currentStopIndex
      const nextSegmentStop = routeStops[state.currentStopIndex];
      state.segmentCoordinates = SimulatorService.extractSegmentCoords(nextSegmentStop);
      state.coordIndex = 0;

      // Determine departure next_stop:
      // - After wrap (was at last): next_stop = routeStops[currentStopIndex] (the first stop we're heading to)
      // - Normal: next_stop = routeStops[advanceToNextStop(currentStopIndex)]
      const departNextStopName = isAtLast
        ? routeStops[state.currentStopIndex].stop.name
        : routeStops[SimulatorService.advanceToNextStop(state.currentStopIndex, routeStops.length)].stop.name;

      const status = `Salió de ${currentStopName}`;
      state.status = status;

      // Get first point of new segment (or stop coords if null segment)
      const coord = SimulatorService.getCurrentCoordinate(
        state.segmentCoordinates,
        0,
        nextSegmentStop,
      );

      await this.publishTelemetry(
        bus.id, assignment.route_id, currentStop.stop.id,
        coord.latitude, coord.longitude, state.passengerCount,
        status, currentStopName, departNextStopName,
      );

      // Advance past the first point we just published
      state.coordIndex = 1;
    } else {
      // DWELL: still stopped — apply passenger variation
      state.passengerCount = SimulatorService.calculatePassengerDelta(
        state.passengerCount,
        bus.capacity,
        Math.random(),
        Math.random(),
      );

      state.status = `En ${currentStopName}`;

      await this.publishTelemetry(
        bus.id, assignment.route_id, currentStop.stop.id,
        Number(currentStop.stop.latitude), Number(currentStop.stop.longitude),
        state.passengerCount, state.status, currentStopName, nextStopName,
      );
    }
  }

  /**
   * Build enriched telemetry payload for Kafka publishing.
   */
  private buildTelemetryPayload(
    busId: number,
    routeId: number,
    stopId: number,
    latitude: number,
    longitude: number,
    passengerCount: number,
    status: string,
    currentStop: string,
    nextStop: string | null,
  ) {
    return {
      bus_id: busId,
      route_id: routeId,
      stop_id: stopId,
      latitude,
      longitude,
      passenger_count: passengerCount,
      status,
      current_stop: currentStop,
      next_stop: nextStop,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Publish a telemetry event to Kafka.
   */
  private async publishTelemetry(
    busId: number,
    routeId: number,
    stopId: number,
    latitude: number,
    longitude: number,
    passengerCount: number,
    status: string,
    currentStop: string,
    nextStop: string | null,
  ): Promise<void> {
    await this.kafkaProducer.publish(
      'bus.telemetry',
      this.buildTelemetryPayload(
        busId, routeId, stopId, latitude, longitude,
        passengerCount, status, currentStop, nextStop,
      ),
    );
  }

  /**
   * Extract coordinates array from a RouteStop's segment_geometry.
   * Returns null if no geometry exists.
   */
  static extractSegmentCoords(routeStop: RouteStop): [number, number][] | null {
    if (!routeStop.segment_geometry?.coordinates?.length) {
      return null;
    }
    return routeStop.segment_geometry.coordinates as [number, number][];
  }

  /**
   * Get the current coordinate to publish.
   * Uses segment interpolation if available, otherwise falls back to stop coordinates.
   */
  static getCurrentCoordinate(
    segmentCoordinates: [number, number][] | null,
    coordIndex: number,
    currentStop: RouteStop,
  ): { latitude: number; longitude: number } {
    if (segmentCoordinates && coordIndex < segmentCoordinates.length) {
      const [lng, lat] = segmentCoordinates[coordIndex];
      return { latitude: lat, longitude: lng };
    }
    return {
      latitude: Number(currentStop.stop.latitude),
      longitude: Number(currentStop.stop.longitude),
    };
  }

  /**
   * Advance position along the route: coordIndex within segment,
   * then segment transition, then circular wrap.
   */
  static advancePosition(
    coordIndex: number,
    segmentCoordinates: [number, number][] | null,
    currentStopIndex: number,
    routeStops: RouteStop[],
  ): { coordIndex: number; currentStopIndex: number; segmentCoordinates: [number, number][] | null } {
    const segLen = segmentCoordinates?.length ?? 0;

    if (segLen > 0 && coordIndex + 1 < segLen) {
      // Still within current segment
      return {
        coordIndex: coordIndex + 1,
        currentStopIndex,
        segmentCoordinates,
      };
    }

    // Segment exhausted — advance to next stop
    const nextIndex = SimulatorService.findNextSegmentIndex(
      currentStopIndex,
      routeStops,
    );

    const nextCoords = SimulatorService.extractSegmentCoords(routeStops[nextIndex]);
    return {
      coordIndex: 0,
      currentStopIndex: nextIndex,
      segmentCoordinates: nextCoords,
    };
  }

  /**
   * Find the next stop index that has a non-null segment_geometry.
   * Wraps circularly if needed. Falls back to stop 0 if no segment has geometry.
   */
  static findNextSegmentIndex(
    currentIndex: number,
    routeStops: RouteStop[],
  ): number {
    const total = routeStops.length;

    // Try next stops circularly
    for (let offset = 1; offset <= total; offset++) {
      const candidate = (currentIndex + offset) % total;
      if (routeStops[candidate].segment_geometry !== null) {
        return candidate;
      }
    }

    // No stop has geometry — wrap to 0
    return 0;
  }

  static advanceToNextStop(currentIndex: number, totalStops: number): number {
    return (currentIndex + 1) % totalStops;
  }

  /**
   * Resolve descriptive status text based on phase and position.
   * Pure function — no side effects.
   */
  static resolveStatus(
    phase: 'MOVING' | 'STOPPED',
    coordIndex: number,
    segmentCoordinatesLength: number,
    currentStopName: string,
    nextStopName: string | null,
    isDeparting: boolean,
  ): string {
    if (isDeparting) {
      return `Salió de ${currentStopName}`;
    }

    if (phase === 'STOPPED') {
      return `En ${currentStopName}`;
    }

    // MOVING phase — check arriving threshold
    const pointsRemaining = segmentCoordinatesLength - coordIndex;
    if (pointsRemaining <= SimulatorService.ARRIVING_THRESHOLD) {
      return `Llegando a ${nextStopName}`;
    }

    return `En camino a ${nextStopName}`;
  }

  /**
   * Calculate passenger delta using percentage-based boarding/alighting.
   * boardingFactor/alightingFactor are 0-1 random values (injected for testability).
   * Boarding: 0-20% of remaining capacity (C - P)
   * Alighting: 0-15% of current passengers (P)
   * Result clamped to [0, capacity].
   */
  static calculatePassengerDelta(
    passengerCount: number,
    capacity: number,
    boardingFactor: number,
    alightingFactor: number,
  ): number {
    const remaining = capacity - passengerCount;
    const boarding = Math.floor(remaining * boardingFactor * 0.20);
    const alighting = Math.floor(passengerCount * alightingFactor * 0.15);
    return Math.max(0, Math.min(passengerCount + boarding - alighting, capacity));
  }

  /**
   * Determine if a STOPPED bus should transition to MOVING.
   * Returns true when elapsed time since stoppedSince >= 60 seconds.
   */
  static shouldTransitionToMoving(
    stoppedSince: Date | null,
    now: Date,
  ): boolean {
    if (!stoppedSince) {
      return false;
    }
    const elapsedMs = now.getTime() - stoppedSince.getTime();
    return elapsedMs >= 60_000;
  }
}
