import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RouteStop } from '../route-stops/entities/route-stop.entity';
import { KafkaProducerService } from './kafka-producer.service';

export interface BusSimulationState {
  routeId: number;
  directionId: number;
  currentStopIndex: number;
  passengerCount: number;
}

@Injectable()
export class SimulatorService {
  private readonly logger = new Logger(SimulatorService.name);
  private running = false;
  private interval: NodeJS.Timeout | null = null;
  private readonly tickSeconds = 5;
  private readonly busStates = new Map<number, BusSimulationState>();

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
      let state = this.busStates.get(bus.id);
      if (!state) {
        state = {
          routeId: assignment.route_id,
          directionId: routeStops[0].direction_id,
          currentStopIndex: 0,
          passengerCount: 0,
        };
        this.busStates.set(bus.id, state);
      }

      const currentStop = routeStops[state.currentStopIndex];

      // Vary passenger count with pseudo-random delta [-5, +5]
      const delta = Math.floor(Math.random() * 11) - 5;
      state.passengerCount = SimulatorService.varyPassengerCount(
        state.passengerCount,
        delta,
        bus.capacity,
      );

      // Publish telemetry
      await this.kafkaProducer.publish('bus.telemetry', {
        bus_id: bus.id,
        route_id: assignment.route_id,
        stop_id: currentStop.stop.id,
        latitude: Number(currentStop.stop.latitude),
        longitude: Number(currentStop.stop.longitude),
        passenger_count: state.passengerCount,
        timestamp: new Date().toISOString(),
      });

      // Advance to next stop cyclically
      state.currentStopIndex = SimulatorService.advanceToNextStop(
        state.currentStopIndex,
        routeStops.length,
      );
    }
  }

  static advanceToNextStop(currentIndex: number, totalStops: number): number {
    return (currentIndex + 1) % totalStops;
  }

  static varyPassengerCount(
    current: number,
    delta: number,
    capacity: number,
  ): number {
    return Math.max(0, Math.min(current + delta, capacity));
  }
}
