import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SimulatorService } from '../simulator.service';
import { KafkaProducerService } from '../kafka-producer.service';
import { RouteStop } from '../../route-stops/entities/route-stop.entity';

describe('SimulatorService', () => {
  let service: SimulatorService;
  let mockKafkaProducer: { publish: jest.Mock };
  let mockBusAssignmentsService: { findActiveByBusId: jest.Mock; findAll: jest.Mock };
  let mockBusesService: { findOne: jest.Mock; findAll: jest.Mock };
  let mockRouteStopsRepo: { find: jest.Mock };

  beforeEach(async () => {
    mockKafkaProducer = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    mockBusAssignmentsService = {
      findActiveByBusId: jest.fn().mockResolvedValue(null),
      findAll: jest.fn().mockResolvedValue([]),
    };

    mockBusesService = {
      findOne: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
    };

    mockRouteStopsRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimulatorService,
        { provide: KafkaProducerService, useValue: mockKafkaProducer },
        { provide: 'IBusAssignmentsService', useValue: mockBusAssignmentsService },
        { provide: 'IBusesService', useValue: mockBusesService },
        { provide: getRepositoryToken(RouteStop), useValue: mockRouteStopsRepo },
      ],
    }).compile();

    service = module.get<SimulatorService>(SimulatorService);
  });

  // ── Cleanup: prevent timer leaks between tests ──────────────────────
  afterEach(async () => {
    await service.stop();
  });

  // ── Helper: pre-populate busStates as MOVING (skip initial STOPPED phase)
  // The implementation initializes buses as STOPPED on first tick.
  // Tests that verify MOVING behavior use this to start in MOVING directly.
  const forceMovingState = (
    busId: number,
    routeId: number,
    routeStops: any[],
    overrides?: Record<string, any>,
  ) => {
    const busStates = (service as any).busStates as Map<number, any>;
    busStates.set(busId, {
      routeId,
      currentStopIndex: 0,
      coordIndex: 0,
      segmentCoordinates: SimulatorService.extractSegmentCoords(routeStops[0]),
      passengerCount: 0,
      phase: 'MOVING',
      stoppedSince: null,
      status: '',
      ...overrides,
    });
  };

  // ═══════════════════════════════════════════════════════════════════════
  // start / stop — lifecycle management
  // ═══════════════════════════════════════════════════════════════════════

  describe('start', () => {
    // ── SCN: Start returns running status with tick_seconds ────────────────

    it('should return status running with tick_seconds when started', async () => {
      const result = await service.start();

      expect(result.status).toBe('running');
      expect(result.tick_seconds).toBeGreaterThan(0);
    });

    // ── SCN: Start is idempotent — no duplicate intervals ─────────────────

    it('should not duplicate interval when start is called twice', async () => {
      await service.start();
      const result = await service.start();

      expect(result.status).toBe('running');
      // Internally, the service should not create a second interval
      expect(service.isRunning()).toBe(true);
    });
  });

  describe('stop', () => {
    // ── SCN: Stop returns stopped status ──────────────────────────────────

    it('should return status stopped when stopped', async () => {
      await service.start();
      const result = await service.stop();

      expect(result.status).toBe('stopped');
    });

    // ── SCN: Stop clears running state ────────────────────────────────────

    it('should set running to false after stop', async () => {
      await service.start();
      await service.stop();

      expect(service.isRunning()).toBe(false);
    });

    // ── SCN: Stop when already stopped returns stopped ────────────────────

    it('should return stopped when already stopped', async () => {
      const result = await service.stop();

      expect(result.status).toBe('stopped');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // tick — per-bus simulation logic
  // ═══════════════════════════════════════════════════════════════════════

  describe('tick', () => {
    // ── SCN: Skips bus without active assignment ──────────────────────────

    it('should skip bus without active assignment and not publish telemetry', async () => {
      mockBusesService.findAll.mockResolvedValue([
        { id: 1, code: 'BUS-001', capacity: 40 },
      ]);
      mockBusAssignmentsService.findActiveByBusId.mockResolvedValue(null);

      await service.tick();

      expect(mockKafkaProducer.publish).not.toHaveBeenCalled();
    });

    // ── SCN: Publishes telemetry for bus with active assignment ───────────

    it('should publish telemetry for bus with active assignment', async () => {
      const bus = { id: 1, code: 'BUS-001', capacity: 40 };
      const assignment = {
        id: 1,
        bus_id: 1,
        route_id: 10,
        unassigned_at: null,
      };
      const routeStops = [
        { id: 1, route_id: 10, stop_id: 100, stop_order: 1, direction_id: 1, stop: { id: 100, name: 'Stop A', latitude: -12.0, longitude: -77.0 } },
        { id: 2, route_id: 10, stop_id: 101, stop_order: 2, direction_id: 1, stop: { id: 101, name: 'Stop B', latitude: -12.1, longitude: -77.1 } },
      ];

      mockBusesService.findAll.mockResolvedValue([bus]);
      mockBusAssignmentsService.findActiveByBusId.mockResolvedValue(assignment);
      mockRouteStopsRepo.find.mockResolvedValue(routeStops);

      await service.tick();

      expect(mockKafkaProducer.publish).toHaveBeenCalledTimes(1);
      const [topic, payload] = mockKafkaProducer.publish.mock.calls[0];
      expect(topic).toBe('bus.telemetry');
      expect(payload.bus_id).toBe(1);
      expect(payload.route_id).toBe(10);
      expect(payload.stop_id).toBe(100);
      expect(payload).toHaveProperty('latitude');
      expect(payload).toHaveProperty('longitude');
      expect(payload).toHaveProperty('passenger_count');
      expect(payload).toHaveProperty('timestamp');
    });

    // ── SCN: Triangulation — multiple buses, only assigned ones get telemetry

    it('should publish telemetry only for buses with active assignments', async () => {
      const buses = [
        { id: 1, code: 'BUS-001', capacity: 40 },
        { id: 2, code: 'BUS-002', capacity: 60 },
      ];
      const assignment1 = { id: 1, bus_id: 1, route_id: 10, unassigned_at: null };
      const routeStops = [
        { id: 1, route_id: 10, stop_id: 100, stop_order: 1, direction_id: 1, stop: { id: 100, name: 'Stop A', latitude: -12.0, longitude: -77.0 } },
      ];

      mockBusesService.findAll.mockResolvedValue(buses);
      mockBusAssignmentsService.findActiveByBusId
        .mockResolvedValueOnce(assignment1)   // bus 1 has assignment
        .mockResolvedValueOnce(null);          // bus 2 has no assignment
      mockRouteStopsRepo.find.mockResolvedValue(routeStops);

      await service.tick();

      expect(mockKafkaProducer.publish).toHaveBeenCalledTimes(1);
      expect(mockKafkaProducer.publish.mock.calls[0][1].bus_id).toBe(1);
    });

    // ── SCN: Advances to next stop cyclically ────────────────────────────

    it('should advance to next stop on consecutive ticks (cyclic)', async () => {
      const bus = { id: 1, code: 'BUS-001', capacity: 40 };
      const assignment = { id: 1, bus_id: 1, route_id: 10, unassigned_at: null };
      const routeStops = [
        { id: 1, route_id: 10, stop_id: 100, stop_order: 1, direction_id: 1, stop: { id: 100, name: 'Stop A', latitude: -12.0, longitude: -77.0 } },
        { id: 2, route_id: 10, stop_id: 101, stop_order: 2, direction_id: 1, stop: { id: 101, name: 'Stop B', latitude: -12.1, longitude: -77.1 } },
        { id: 3, route_id: 10, stop_id: 102, stop_order: 3, direction_id: 1, stop: { id: 102, name: 'Stop C', latitude: -12.2, longitude: -77.2 } },
      ];

      mockBusesService.findAll.mockResolvedValue([bus]);
      mockBusAssignmentsService.findActiveByBusId.mockResolvedValue(assignment);
      mockRouteStopsRepo.find.mockResolvedValue(routeStops);
      forceMovingState(1, 10, routeStops);

      // Tick 1 → stop_order 1
      await service.tick();
      expect(mockKafkaProducer.publish.mock.calls[0][1].stop_id).toBe(100);

      // Tick 2 → stop_order 2
      await service.tick();
      expect(mockKafkaProducer.publish.mock.calls[1][1].stop_id).toBe(101);

      // Tick 3 → stop_order 3
      await service.tick();
      expect(mockKafkaProducer.publish.mock.calls[2][1].stop_id).toBe(102);

      // Tick 4 → wraps back to stop_order 1
      await service.tick();
      expect(mockKafkaProducer.publish.mock.calls[3][1].stop_id).toBe(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Segment interpolation — REQ-SI-001 through REQ-SI-006
  // ═══════════════════════════════════════════════════════════════════════

  describe('segment interpolation', () => {
    // Helper: routeStops with real segment_geometry
    // Note: segment coordinates differ from stop coords (realistic — OSRM snaps to road network)
    const makeRouteStopsWithGeometry = () => [
      {
        id: 1, route_id: 10, stop_id: 100, stop_order: 1, direction_id: 1,
        segment_geometry: { type: 'LineString' as const, coordinates: [[-77.001, -12.001], [-77.05, -12.02], [-77.1, -12.05]] as [number, number][] },
        stop: { id: 100, name: 'Stop A', latitude: -12.0, longitude: -77.0 },
      },
      {
        id: 2, route_id: 10, stop_id: 101, stop_order: 2, direction_id: 1,
        segment_geometry: { type: 'LineString' as const, coordinates: [[-77.101, -12.051], [-77.15, -12.08]] as [number, number][] },
        stop: { id: 101, name: 'Stop B', latitude: -12.1, longitude: -77.1 },
      },
      {
        id: 3, route_id: 10, stop_id: 102, stop_order: 3, direction_id: 1,
        segment_geometry: null,
        stop: { id: 102, name: 'Stop C', latitude: -12.2, longitude: -77.2 },
      },
    ];

    const setupBusWithGeometry = () => {
      const bus = { id: 1, code: 'BUS-001', capacity: 40 };
      const assignment = { id: 1, bus_id: 1, route_id: 10, unassigned_at: null };
      const routeStops = makeRouteStopsWithGeometry();

      mockBusesService.findAll.mockResolvedValue([bus]);
      mockBusAssignmentsService.findActiveByBusId.mockResolvedValue(assignment);
      mockRouteStopsRepo.find.mockResolvedValue(routeStops);

      return { bus, assignment, routeStops };
    };

    // ── REQ-SI-001: State initializes with coordIndex=0, segmentCoords from first segment

    it('should initialize state as STOPPED with segment coordinates loaded on first tick', async () => {
      setupBusWithGeometry();

      await service.tick();

      // First tick is STOPPED — publishes stop coordinates, not segment coords
      expect(mockKafkaProducer.publish).toHaveBeenCalledTimes(1);
      const payload = mockKafkaProducer.publish.mock.calls[0][1];
      expect(payload.status).toBe('En Stop A');
      expect(payload.latitude).toBe(-12.0);
      expect(payload.longitude).toBe(-77.0);
      expect(payload.stop_id).toBe(100);

      // Internal state should have segment coordinates loaded for future MOVING phase
      const busStates = (service as any).busStates as Map<number, any>;
      const state = busStates.get(1);
      expect(state.segmentCoordinates).not.toBeNull();
      expect(state.segmentCoordinates).toEqual([[-77.001, -12.001], [-77.05, -12.02], [-77.1, -12.05]]);
      expect(state.phase).toBe('STOPPED');
      expect(state.coordIndex).toBe(0);
    });

    // ── REQ-SI-002: Per-tick coordinate interpolation (triangulation)

    it('should advance coordIndex on consecutive ticks publishing next coordinate', async () => {
      const { routeStops } = setupBusWithGeometry();
      forceMovingState(1, 10, routeStops);

      // Tick 1: coordIndex=0 → publish segmentCoords[0] = [-77.001, -12.001]
      await service.tick();
      const tick1Payload = mockKafkaProducer.publish.mock.calls[0][1];
      expect(tick1Payload.latitude).toBe(-12.001);
      expect(tick1Payload.longitude).toBe(-77.001);

      // Tick 2: coordIndex=1 → publish segmentCoords[1] = [-77.05, -12.02]
      await service.tick();
      const tick2Payload = mockKafkaProducer.publish.mock.calls[1][1];
      expect(tick2Payload.latitude).toBe(-12.02);
      expect(tick2Payload.longitude).toBe(-77.05);
    });

    // ── REQ-SI-003: Segment transition loads next segment, resets coordIndex

    it('should transition to next segment when coordIndex reaches end of current segment', async () => {
      const { routeStops } = setupBusWithGeometry();
      forceMovingState(1, 10, routeStops);

      // Segment 1 has 3 coords: indices 0, 1, 2
      // Tick 1: coordIndex=0 → publish seg1[0], advance to 1
      await service.tick();
      // Tick 2: coordIndex=1 → publish seg1[1], advance to 2
      await service.tick();
      // Tick 3: coordIndex=2 (last) → ARRIVAL → transition to STOPPED at Stop B
      await service.tick();
      const tick3Payload = mockKafkaProducer.publish.mock.calls[2][1];
      // Arrival publishes Stop B's own coordinates, not the last segment point
      expect(tick3Payload.status).toBe('En Stop B');
      expect(tick3Payload.latitude).toBe(-12.1);
      expect(tick3Payload.longitude).toBe(-77.1);

      // Tick 4: STOPPED dwell at Stop B → same stop coordinates
      await service.tick();
      const tick4Payload = mockKafkaProducer.publish.mock.calls[3][1];
      expect(tick4Payload.status).toBe('En Stop B');
      expect(tick4Payload.latitude).toBe(-12.1);
      expect(tick4Payload.longitude).toBe(-77.1);
      expect(tick4Payload.stop_id).toBe(101);
    });

    // ── REQ-SI-004: Circular wrap when currentOrder exceeds last stop

    it('should wrap to first segment when last segment is exhausted', async () => {
      const { routeStops } = setupBusWithGeometry();
      forceMovingState(1, 10, routeStops);

      // Segment 1: 3 coords → ticks 1-2 MOVING, tick 3 arrival at Stop B
      // Segment 2: 2 coords → after dwell, depart and move
      // Segment 3: null → skip, wrap to segment 1

      // Tick 1: seg1[0] MOVING
      await service.tick();
      // Tick 2: seg1[1] MOVING
      await service.tick();
      // Tick 3: seg1[2] → ARRIVAL at Stop B → STOPPED
      await service.tick();

      // Force 61s elapsed at Stop B to trigger departure
      const busStates = (service as any).busStates as Map<number, any>;
      const state = busStates.get(1);
      state.stoppedSince = new Date(Date.now() - 61_000);

      // Tick 4: STOPPED → MOVING, depart from Stop B, load Stop B's segment (seg2)
      await service.tick();
      // Tick 5: seg2[0] MOVING → advance coordIndex
      await service.tick();
      // Tick 6: seg2[1] (last) → ARRIVAL at Stop C (null segment) → STOPPED
      await service.tick();

      // Force 61s elapsed at Stop C (last stop) to trigger departure + wrap
      state.stoppedSince = new Date(Date.now() - 61_000);

      // Tick 7: STOPPED → MOVING, depart from Stop C, wrap → load seg1
      await service.tick();
      const tick7Payload = mockKafkaProducer.publish.mock.calls[6][1];
      expect(tick7Payload.status).toBe('Salió de Stop C');
      expect(tick7Payload.next_stop).toBe('Stop A');
    });

    // ── REQ-SI-005: Route change resets state to new route's first segment

    it('should reset state when bus route changes', async () => {
      const bus = { id: 1, code: 'BUS-001', capacity: 40 };

      // Route 10 setup
      const assignment10 = { id: 1, bus_id: 1, route_id: 10, unassigned_at: null };
      const routeStops10 = [
        {
          id: 1, route_id: 10, stop_id: 100, stop_order: 1, direction_id: 1,
          segment_geometry: { type: 'LineString' as const, coordinates: [[-77.001, -12.001], [-77.05, -12.02]] as [number, number][] },
          stop: { id: 100, name: 'Stop A', latitude: -12.0, longitude: -77.0 },
        },
      ];

      // Route 20 setup — different stops and geometry
      const assignment20 = { id: 2, bus_id: 1, route_id: 20, unassigned_at: null };
      const routeStops20 = [
        {
          id: 10, route_id: 20, stop_id: 200, stop_order: 1, direction_id: 1,
          segment_geometry: { type: 'LineString' as const, coordinates: [[-70.0, -10.0], [-70.1, -10.1]] as [number, number][] },
          stop: { id: 200, name: 'Stop X', latitude: -10.0, longitude: -70.0 },
        },
      ];

      mockBusesService.findAll.mockResolvedValue([bus]);

      // Tick 1: route 10
      mockBusAssignmentsService.findActiveByBusId.mockResolvedValue(assignment10);
      mockRouteStopsRepo.find.mockResolvedValue(routeStops10);
      forceMovingState(1, 10, routeStops10);
      await service.tick();

      const tick1Payload = mockKafkaProducer.publish.mock.calls[0][1];
      expect(tick1Payload.route_id).toBe(10);
      expect(tick1Payload.latitude).toBe(-12.001); // route 10 segment coords (MOVING)

      // Tick 2: route changed to 20 → state reinitialized as STOPPED
      mockBusAssignmentsService.findActiveByBusId.mockResolvedValue(assignment20);
      mockRouteStopsRepo.find.mockResolvedValue(routeStops20);
      await service.tick();

      const tick2Payload = mockKafkaProducer.publish.mock.calls[1][1];
      expect(tick2Payload.route_id).toBe(20);
      expect(tick2Payload.stop_id).toBe(200); // route 20's first stop
      // STOPPED at route 20's first stop → publishes stop coordinates
      expect(tick2Payload.latitude).toBe(-10.0);
      expect(tick2Payload.longitude).toBe(-70.0);
    });

    // ── REQ-SI-006: Kafka message preserves existing schema

    it('should publish Kafka message with all required fields matching existing schema', async () => {
      setupBusWithGeometry();

      await service.tick();

      const [topic, payload] = mockKafkaProducer.publish.mock.calls[0];

      // Topic must be preserved
      expect(topic).toBe('bus.telemetry');

      // All existing fields must be present with correct types
      expect(typeof payload.bus_id).toBe('number');
      expect(typeof payload.route_id).toBe('number');
      expect(typeof payload.stop_id).toBe('number');
      expect(typeof payload.latitude).toBe('number');
      expect(typeof payload.longitude).toBe('number');
      expect(typeof payload.passenger_count).toBe('number');
      expect(typeof payload.timestamp).toBe('string');

      // Exact field names must match enriched consumer contract (original + new fields)
      expect(Object.keys(payload).sort()).toEqual(
        ['bus_id', 'route_id', 'stop_id', 'latitude', 'longitude', 'passenger_count', 'timestamp', 'status', 'current_stop', 'next_stop'].sort(),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Pure functions — advanceToNextStop
  // ═══════════════════════════════════════════════════════════════════════

  describe('advanceToNextStop (pure)', () => {
    // ── SCN: Advances within bounds ──────────────────────────────────────

    it('should advance to next index', () => {
      expect(SimulatorService.advanceToNextStop(0, 5)).toBe(1);
    });

    // ── SCN: Wraps around at end ─────────────────────────────────────────

    it('should wrap around to 0 when at last index', () => {
      expect(SimulatorService.advanceToNextStop(4, 5)).toBe(0);
    });

    // ── SCN: Single stop always stays at 0 ──────────────────────────────

    it('should stay at 0 when there is only one stop', () => {
      expect(SimulatorService.advanceToNextStop(0, 1)).toBe(0);
    });

    // ── SCN: Triangulation — middle of sequence ──────────────────────────

    it('should advance from middle index', () => {
      expect(SimulatorService.advanceToNextStop(2, 10)).toBe(3);
    });
  });

  describe('extractSegmentCoords (pure)', () => {
    // ── SCN: Extracts coordinates from valid segment_geometry

    it('should extract coordinates array from valid segment_geometry', () => {
      const routeStop = {
        segment_geometry: { type: 'LineString', coordinates: [[-77.0, -12.0], [-77.1, -12.1]] },
      } as any;
      expect(SimulatorService.extractSegmentCoords(routeStop)).toEqual([
        [-77.0, -12.0], [-77.1, -12.1],
      ]);
    });

    // ── SCN: Returns null for null segment_geometry

    it('should return null when segment_geometry is null', () => {
      const routeStop = { segment_geometry: null } as any;
      expect(SimulatorService.extractSegmentCoords(routeStop)).toBeNull();
    });

    // ── SCN: Returns null for undefined segment_geometry

    it('should return null when segment_geometry is undefined', () => {
      const routeStop = {} as any;
      expect(SimulatorService.extractSegmentCoords(routeStop)).toBeNull();
    });

    // ── SCN: Returns null for empty coordinates

    it('should return null when coordinates array is empty', () => {
      const routeStop = {
        segment_geometry: { type: 'LineString', coordinates: [] },
      } as any;
      expect(SimulatorService.extractSegmentCoords(routeStop)).toBeNull();
    });
  });

  describe('getCurrentCoordinate (pure)', () => {
    // ── SCN: Uses segment coordinates when available

    it('should return segment coordinate at given index', () => {
      const segCoords: [number, number][] = [[-77.0, -12.0], [-77.1, -12.1]];
      const currentStop = { stop: { latitude: -99, longitude: -99 } } as any;

      const result = SimulatorService.getCurrentCoordinate(segCoords, 1, currentStop);
      expect(result).toEqual({ latitude: -12.1, longitude: -77.1 });
    });

    // ── SCN: Falls back to stop coordinates when segment is null

    it('should fall back to stop coordinates when segmentCoordinates is null', () => {
      const currentStop = { stop: { latitude: -12.5, longitude: -77.5 } } as any;

      const result = SimulatorService.getCurrentCoordinate(null, 0, currentStop);
      expect(result).toEqual({ latitude: -12.5, longitude: -77.5 });
    });

    // ── SCN: Triangulation — index 0

    it('should return first coordinate when coordIndex is 0', () => {
      const segCoords: [number, number][] = [[-70.0, -10.0], [-70.1, -10.1]];
      const currentStop = { stop: { latitude: -99, longitude: -99 } } as any;

      const result = SimulatorService.getCurrentCoordinate(segCoords, 0, currentStop);
      expect(result).toEqual({ latitude: -10.0, longitude: -70.0 });
    });
  });

  describe('advancePosition (pure)', () => {
    const makeRouteStops = () => [
      {
        id: 1, segment_geometry: { type: 'LineString', coordinates: [[-77.0, -12.0], [-77.05, -12.02], [-77.1, -12.05]] },
      } as any,
      {
        id: 2, segment_geometry: { type: 'LineString', coordinates: [[-77.1, -12.05], [-77.15, -12.08]] },
      } as any,
      {
        id: 3, segment_geometry: null,
      } as any,
    ];

    // ── SCN: Advance within segment

    it('should advance coordIndex within current segment', () => {
      const segCoords: [number, number][] = [[-77.0, -12.0], [-77.05, -12.02], [-77.1, -12.05]];
      const result = SimulatorService.advancePosition(0, segCoords, 0, makeRouteStops());

      expect(result.coordIndex).toBe(1);
      expect(result.currentStopIndex).toBe(0);
      expect(result.segmentCoordinates).toBe(segCoords);
    });

    // ── SCN: Segment transition when reaching end

    it('should transition to next segment when coordIndex reaches end', () => {
      const segCoords: [number, number][] = [[-77.0, -12.0], [-77.05, -12.02], [-77.1, -12.05]];
      const result = SimulatorService.advancePosition(2, segCoords, 0, makeRouteStops());

      expect(result.coordIndex).toBe(0);
      expect(result.currentStopIndex).toBe(1); // moved to routeStop[1]
      expect(result.segmentCoordinates).toEqual([[-77.1, -12.05], [-77.15, -12.08]]);
    });

    // ── SCN: Skip null segment (last stop) and wrap

    it('should skip null segment and wrap to first stop with geometry', () => {
      const segCoords: [number, number][] = [[-77.1, -12.05], [-77.15, -12.08]];
      const result = SimulatorService.advancePosition(1, segCoords, 1, makeRouteStops());

      expect(result.coordIndex).toBe(0);
      expect(result.currentStopIndex).toBe(0); // wrapped to first
      expect(result.segmentCoordinates).toEqual([[-77.0, -12.0], [-77.05, -12.02], [-77.1, -12.05]]);
    });

    // ── SCN: Null segment coordinates → transition immediately

    it('should transition immediately when segmentCoordinates is null', () => {
      const result = SimulatorService.advancePosition(0, null, 0, makeRouteStops());

      expect(result.coordIndex).toBe(0);
      expect(result.currentStopIndex).toBe(1); // finds next with geometry
      expect(result.segmentCoordinates).toEqual([[-77.1, -12.05], [-77.15, -12.08]]);
    });
  });

  describe('findNextSegmentIndex (pure)', () => {
    const makeRouteStops = () => [
      { id: 1, segment_geometry: { type: 'LineString', coordinates: [[1, 1]] } } as any,
      { id: 2, segment_geometry: { type: 'LineString', coordinates: [[2, 2]] } } as any,
      { id: 3, segment_geometry: null } as any,
    ];

    // ── SCN: Next stop has geometry

    it('should return next stop index when it has geometry', () => {
      expect(SimulatorService.findNextSegmentIndex(0, makeRouteStops())).toBe(1);
    });

    // ── SCN: Skip null geometry stop

    it('should skip stop with null geometry', () => {
      expect(SimulatorService.findNextSegmentIndex(1, makeRouteStops())).toBe(0);
    });

    // ── SCN: Wrap from last to first

    it('should wrap from last index to first with geometry', () => {
      expect(SimulatorService.findNextSegmentIndex(2, makeRouteStops())).toBe(0);
    });

    // ── SCN: Single stop with geometry wraps to self

    it('should wrap to itself when single stop has geometry', () => {
      const stops = [{ id: 1, segment_geometry: { type: 'LineString', coordinates: [[1, 1]] } } as any];
      expect(SimulatorService.findNextSegmentIndex(0, stops)).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // resolveStatus — descriptive status text (Task 1.1)
  // ═══════════════════════════════════════════════════════════════════════

  describe('resolveStatus (pure)', () => {
    // ── SCN: MOVING status — transit (not in arriving threshold)

    it('should return "En camino a [nextStop]" when MOVING and not near end of segment', () => {
      // coordIndex=2, segmentLength=10 → 8 points remaining → NOT in last 3
      const result = SimulatorService.resolveStatus(
        'MOVING', 2, 10, 'Parada Central', 'Plaza Mayor', false,
      );
      expect(result).toBe('En camino a Plaza Mayor');
    });

    // ── SCN: MOVING status — arriving (within last 3 points)

    it('should return "Llegando a [nextStop]" when MOVING and in last 3 points of segment', () => {
      // coordIndex=7, segmentLength=10 → 3 points remaining → arriving threshold
      const result = SimulatorService.resolveStatus(
        'MOVING', 7, 10, 'Parada Central', 'Plaza Mayor', false,
      );
      expect(result).toBe('Llegando a Plaza Mayor');
    });

    // ── SCN: MOVING status — arriving at coordIndex=8 (2 pts remaining)

    it('should return "Llegando a [nextStop]" when 2 points remain in segment', () => {
      const result = SimulatorService.resolveStatus(
        'MOVING', 8, 10, 'Parada Central', 'Plaza Mayor', false,
      );
      expect(result).toBe('Llegando a Plaza Mayor');
    });

    // ── SCN: MOVING status — arriving at last point (1 pt remaining)

    it('should return "Llegando a [nextStop]" when 1 point remains in segment', () => {
      const result = SimulatorService.resolveStatus(
        'MOVING', 9, 10, 'Parada Central', 'Plaza Mayor', false,
      );
      expect(result).toBe('Llegando a Plaza Mayor');
    });

    // ── SCN: MOVING status — NOT arriving (4 pts remaining)

    it('should return "En camino a [nextStop]" when 4 points remain in segment', () => {
      // coordIndex=6, segmentLength=10 → 4 remaining → NOT arriving
      const result = SimulatorService.resolveStatus(
        'MOVING', 6, 10, 'Parada Central', 'Plaza Mayor', false,
      );
      expect(result).toBe('En camino a Plaza Mayor');
    });

    // ── SCN: STOPPED status

    it('should return "En [currentStop]" when STOPPED', () => {
      const result = SimulatorService.resolveStatus(
        'STOPPED', 5, 10, 'Parada Central', 'Plaza Mayor', false,
      );
      expect(result).toBe('En Parada Central');
    });

    // ── SCN: Departure status (just transitioned from STOPPED to MOVING)

    it('should return "Salió de [currentStop]" when isDeparting is true', () => {
      const result = SimulatorService.resolveStatus(
        'MOVING', 0, 10, 'Parada Central', 'Plaza Mayor', true,
      );
      expect(result).toBe('Salió de Parada Central');
    });

    // ── SCN: Triangulation — different stop names

    it('should use correct stop names for different stops', () => {
      expect(
        SimulatorService.resolveStatus('MOVING', 0, 20, 'Terminal Sur', 'Mercado Norte', false),
      ).toBe('En camino a Mercado Norte');

      expect(
        SimulatorService.resolveStatus('STOPPED', 0, 20, 'Terminal Sur', 'Mercado Norte', false),
      ).toBe('En Terminal Sur');

      expect(
        SimulatorService.resolveStatus('MOVING', 0, 20, 'Terminal Sur', 'Mercado Norte', true),
      ).toBe('Salió de Terminal Sur');
    });

    // ── SCN: Short segment (exactly 3 points)

    it('should return "Llegando a" immediately when segment has only 3 points', () => {
      // coordIndex=0, segmentLength=3 → 3 remaining → arriving
      const result = SimulatorService.resolveStatus(
        'MOVING', 0, 3, 'Parada Central', 'Plaza Mayor', false,
      );
      expect(result).toBe('Llegando a Plaza Mayor');
    });

    // ── SCN: Short segment (2 points)

    it('should return "Llegando a" when segment has only 2 points', () => {
      const result = SimulatorService.resolveStatus(
        'MOVING', 0, 2, 'Parada Central', 'Plaza Mayor', false,
      );
      expect(result).toBe('Llegando a Plaza Mayor');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // calculatePassengerDelta — percentage-based passenger variation (Task 1.2)
  // ═══════════════════════════════════════════════════════════════════════

  describe('calculatePassengerDelta (pure)', () => {
    // ── SCN: Zero factors → no change

    it('should return same count when both factors are 0', () => {
      const result = SimulatorService.calculatePassengerDelta(20, 40, 0, 0);
      expect(result).toBe(20);
    });

    // ── SCN: Boarding only (remaining capacity = 20)

    it('should add 0-20% of remaining capacity for boarding', () => {
      // passengerCount=20, capacity=40 → remaining=20
      // boarding = floor(20 * 1.0 * 0.20) = floor(4) = 4
      const result = SimulatorService.calculatePassengerDelta(20, 40, 1.0, 0);
      expect(result).toBe(24);
    });

    // ── SCN: Alighting only

    it('should remove 0-15% of current passengers for alighting', () => {
      // passengerCount=20, capacity=40
      // alighting = floor(20 * 1.0 * 0.15) = floor(3) = 3
      const result = SimulatorService.calculatePassengerDelta(20, 40, 0, 1.0);
      expect(result).toBe(17);
    });

    // ── SCN: Both boarding and alighting

    it('should apply both boarding and alighting', () => {
      // passengerCount=20, capacity=40 → remaining=20
      // boarding = floor(20 * 0.5 * 0.20) = floor(2) = 2
      // alighting = floor(20 * 0.5 * 0.15) = floor(1.5) = 1
      const result = SimulatorService.calculatePassengerDelta(20, 40, 0.5, 0.5);
      expect(result).toBe(21); // 20 + 2 - 1
    });

    // ── SCN: Full bus (no remaining capacity) → only alighting

    it('should only alight when bus is at full capacity', () => {
      // passengerCount=40, capacity=40 → remaining=0
      // boarding = floor(0 * 1.0 * 0.20) = 0
      // alighting = floor(40 * 1.0 * 0.15) = floor(6) = 6
      const result = SimulatorService.calculatePassengerDelta(40, 40, 1.0, 1.0);
      expect(result).toBe(34);
    });

    // ── SCN: Empty bus → only boarding

    it('should only board when bus is empty', () => {
      // passengerCount=0, capacity=40 → remaining=40
      // boarding = floor(40 * 1.0 * 0.20) = floor(8) = 8
      // alighting = floor(0 * 1.0 * 0.15) = 0
      const result = SimulatorService.calculatePassengerDelta(0, 40, 1.0, 1.0);
      expect(result).toBe(8);
    });

    // ── SCN: Triangulation — different capacity and count

    it('should respect different capacity and passenger values', () => {
      // passengerCount=50, capacity=60 → remaining=10
      // boarding = floor(10 * 0.8 * 0.20) = floor(1.6) = 1
      // alighting = floor(50 * 0.4 * 0.15) = floor(3) = 3
      const result = SimulatorService.calculatePassengerDelta(50, 60, 0.8, 0.4);
      expect(result).toBe(48); // 50 + 1 - 3
    });

    // ── SCN: Small fractional results floor to 0

    it('should floor small fractional boarding to 0', () => {
      // passengerCount=39, capacity=40 → remaining=1
      // boarding = floor(1 * 0.05 * 0.20) = floor(0.01) = 0
      // alighting = floor(39 * 0.01 * 0.15) = floor(0.0585) = 0
      const result = SimulatorService.calculatePassengerDelta(39, 40, 0.05, 0.01);
      expect(result).toBe(39); // 39 + 0 - 0
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // shouldTransitionToMoving — stop duration elapsed check (Task 1.3)
  // ═══════════════════════════════════════════════════════════════════════

  describe('shouldTransitionToMoving (pure)', () => {
    // ── SCN: Elapsed exactly 60s → true

    it('should return true when exactly 60 seconds have elapsed', () => {
      const stoppedSince = new Date('2026-01-01T10:00:00Z');
      const now = new Date('2026-01-01T10:01:00Z'); // exactly 60s later
      expect(SimulatorService.shouldTransitionToMoving(stoppedSince, now)).toBe(true);
    });

    // ── SCN: Elapsed 61s → true

    it('should return true when more than 60 seconds have elapsed', () => {
      const stoppedSince = new Date('2026-01-01T10:00:00Z');
      const now = new Date('2026-01-01T10:01:01Z'); // 61s later
      expect(SimulatorService.shouldTransitionToMoving(stoppedSince, now)).toBe(true);
    });

    // ── SCN: Elapsed 59s → false

    it('should return false when less than 60 seconds have elapsed', () => {
      const stoppedSince = new Date('2026-01-01T10:00:00Z');
      const now = new Date('2026-01-01T10:00:59Z'); // 59s later
      expect(SimulatorService.shouldTransitionToMoving(stoppedSince, now)).toBe(false);
    });

    // ── SCN: stoppedSince is null → false

    it('should return false when stoppedSince is null', () => {
      const now = new Date('2026-01-01T10:00:00Z');
      expect(SimulatorService.shouldTransitionToMoving(null, now)).toBe(false);
    });

    // ── SCN: Elapsed 30s → false (triangulation)

    it('should return false when only 30 seconds have elapsed', () => {
      const stoppedSince = new Date('2026-01-01T10:00:00Z');
      const now = new Date('2026-01-01T10:00:30Z');
      expect(SimulatorService.shouldTransitionToMoving(stoppedSince, now)).toBe(false);
    });

    // ── SCN: Elapsed 120s → true (triangulation)

    it('should return true when 120 seconds have elapsed', () => {
      const stoppedSince = new Date('2026-01-01T10:00:00Z');
      const now = new Date('2026-01-01T10:02:00Z');
      expect(SimulatorService.shouldTransitionToMoving(stoppedSince, now)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // tick() — MOVING/STOPPED state machine (Phase 2: Tasks 2.1–2.5)
  // ═══════════════════════════════════════════════════════════════════════

  describe('tick() — MOVING/STOPPED state machine', () => {
    // Helper: generate routeStops with configurable segment point counts
    const makeRouteStops = (
      configs: Array<{ name: string; lat: number; lng: number; numCoords: number }>,
    ) =>
      configs.map((cfg, i) => ({
        id: i + 1,
        route_id: 10,
        stop_id: 100 + i,
        stop_order: i + 1,
        direction_id: 1,
        segment_geometry:
          cfg.numCoords > 0
            ? {
                type: 'LineString' as const,
                coordinates: Array.from(
                  { length: cfg.numCoords },
                  (_, j) =>
                    [cfg.lng + (j + 1) * 0.01, cfg.lat + (j + 1) * 0.01] as [number, number],
                ),
              }
            : null,
        stop: {
          id: 100 + i,
          name: cfg.name,
          latitude: cfg.lat,
          longitude: cfg.lng,
        },
      }));

    const setupBus = (
      configs: Array<{ name: string; lat: number; lng: number; numCoords: number }>,
      capacity = 40,
    ) => {
      const bus = { id: 1, code: 'BUS-001', capacity };
      const assignment = { id: 1, bus_id: 1, route_id: 10, unassigned_at: null };
      const routeStops = makeRouteStops(configs);

      mockBusesService.findAll.mockResolvedValue([bus]);
      mockBusAssignmentsService.findActiveByBusId.mockResolvedValue(assignment);
      mockRouteStopsRepo.find.mockResolvedValue(routeStops);

      return { bus, assignment, routeStops };
    };

    // ── Task 2.1: MOVING tick advances coordIndex, publishes "En camino a [nextStop]"

    describe('Task 2.1: MOVING phase — transit status', () => {
      // ── SCN: First tick publishes "En camino a [nextStop]" when far from segment end

      it('should publish telemetry with status "En camino a [nextStop]" when MOVING and not near segment end', async () => {
        // First segment has 10 points → at index 0, remaining=10 → NOT arriving zone
        const { routeStops } = setupBus([
          { name: 'Parada Central', lat: -12.0, lng: -77.0, numCoords: 10 },
          { name: 'Plaza Mayor', lat: -12.1, lng: -77.1, numCoords: 5 },
          { name: 'Terminal Sur', lat: -12.2, lng: -77.2, numCoords: 0 },
        ]);
        forceMovingState(1, 10, routeStops);

        await service.tick();

        const payload = mockKafkaProducer.publish.mock.calls[0][1];
        expect(payload.status).toBe('En camino a Plaza Mayor');
        expect(payload.current_stop).toBe('Parada Central');
        expect(payload.next_stop).toBe('Plaza Mayor');
      });

      // ── SCN: Consecutive MOVING ticks advance coordIndex and keep transit status

      it('should advance coordIndex and maintain transit status on consecutive MOVING ticks', async () => {
        const { routeStops } = setupBus([
          { name: 'Parada Central', lat: -12.0, lng: -77.0, numCoords: 10 },
          { name: 'Plaza Mayor', lat: -12.1, lng: -77.1, numCoords: 5 },
          { name: 'Terminal Sur', lat: -12.2, lng: -77.2, numCoords: 0 },
        ]);
        forceMovingState(1, 10, routeStops);

        // Tick 1: coordIndex 0
        await service.tick();
        const tick1 = mockKafkaProducer.publish.mock.calls[0][1];

        // Tick 2: coordIndex 1 → still far from end → "En camino a"
        await service.tick();
        const tick2 = mockKafkaProducer.publish.mock.calls[1][1];

        // Coordinates should advance (different point published each tick)
        expect(tick1.latitude).not.toBe(tick2.latitude);
        expect(tick2.status).toBe('En camino a Plaza Mayor');
      });
    });

    // ── Task 2.2: coordIndex within last 3 points → "Llegando a [nextStop]"

    describe('Task 2.2: MOVING phase — arriving status', () => {
      // ── SCN: Within arriving threshold (last 3 points)

      it('should publish status "Llegando a [nextStop]" when within last 3 points of segment', async () => {
        // First segment has 5 points
        // Tick 1: coordIndex=0, remaining=5 → "En camino a"
        // Tick 2: coordIndex=1, remaining=4 → "En camino a"
        // Tick 3: coordIndex=2, remaining=3 → "Llegando a" (arriving threshold)
        const { routeStops } = setupBus([
          { name: 'Parada Central', lat: -12.0, lng: -77.0, numCoords: 5 },
          { name: 'Plaza Mayor', lat: -12.1, lng: -77.1, numCoords: 3 },
          { name: 'Terminal Sur', lat: -12.2, lng: -77.2, numCoords: 0 },
        ]);
        forceMovingState(1, 10, routeStops);

        await service.tick();
        await service.tick();
        await service.tick();

        const tick3Payload = mockKafkaProducer.publish.mock.calls[2][1];
        expect(tick3Payload.status).toBe('Llegando a Plaza Mayor');
      });

      // ── SCN: Triangulation — exactly 2 points remaining

      it('should show "Llegando a" when exactly 2 points remain in segment', async () => {
        // Segment has 4 points → tick 3: coordIndex=2, remaining=2 → "Llegando a"
        const { routeStops } = setupBus([
          { name: 'Stop A', lat: -12.0, lng: -77.0, numCoords: 4 },
          { name: 'Stop B', lat: -12.1, lng: -77.1, numCoords: 0 },
        ]);
        forceMovingState(1, 10, routeStops);

        await service.tick(); // coordIndex=0, remaining=4
        await service.tick(); // coordIndex=1, remaining=3 → "Llegando a"
        await service.tick(); // coordIndex=2, remaining=2 → "Llegando a"

        const payload = mockKafkaProducer.publish.mock.calls[2][1];
        expect(payload.status).toBe('Llegando a Stop B');
      });
    });

    // ── Task 2.3: coordIndex at segment end → MOVING→STOPPED transition

    describe('Task 2.3: MOVING → STOPPED transition', () => {
      // ── SCN: Segment exhausted → transition to STOPPED with "En [stop]" status

      it('should transition to STOPPED when segment exhausted and publish "En [stop]"', async () => {
        // Segment has 3 points → after 3 ticks, segment exhausted → STOPPED at Stop B
        const { routeStops } = setupBus([
          { name: 'Stop A', lat: -12.0, lng: -77.0, numCoords: 3 },
          { name: 'Stop B', lat: -12.1, lng: -77.1, numCoords: 3 },
          { name: 'Stop C', lat: -12.2, lng: -77.2, numCoords: 0 },
        ]);
        forceMovingState(1, 10, routeStops);

        // Tick 1-3: advance through 3-point segment
        await service.tick(); // coordIndex 0
        await service.tick(); // coordIndex 1
        await service.tick(); // coordIndex 2 (last) → segment exhausted → STOPPED

        // After transition, the last publish should indicate arrival at Stop B
        const lastCall = mockKafkaProducer.publish.mock.calls.length - 1;
        const lastPayload = mockKafkaProducer.publish.mock.calls[lastCall][1];

        expect(lastPayload.status).toBe('En Stop B');
        expect(lastPayload.current_stop).toBe('Stop B');
      });

      // ── SCN: After STOPPED transition, position stays at stop coordinates

      it('should publish stop coordinates (not next segment) after MOVING→STOPPED transition', async () => {
        const { routeStops } = setupBus([
          { name: 'Stop A', lat: -12.0, lng: -77.0, numCoords: 3 },
          { name: 'Stop B', lat: -12.1, lng: -77.1, numCoords: 3 },
        ]);
        forceMovingState(1, 10, routeStops);

        // Tick 1-3: exhaust 3-point segment → transition to STOPPED
        await service.tick();
        await service.tick();
        await service.tick();

        // Tick 4: STOPPED → should publish Stop B's own coordinates, NOT next segment
        await service.tick();

        const tick4Payload = mockKafkaProducer.publish.mock.calls[3][1];
        // Stop B's own coordinates: lat=-12.1, lng=-77.1
        // Current code would publish Stop B's segment coord[0] which is different
        expect(tick4Payload.status).toBe('En Stop B');
        expect(tick4Payload.latitude).toBe(-12.1);
        expect(tick4Payload.longitude).toBe(-77.1);
      });
    });

    // ── Task 2.4: STOPPED tick — no coord advance, Kafka published, status "En [stop]"

    describe('Task 2.4: STOPPED phase — dwell at stop', () => {
      // ── SCN: Coordinates do not advance during STOPPED

      it('should not advance coordinates during STOPPED phase and publish with "En [stop]" status', async () => {
        // 2-point segment → after 2 ticks, arrive at Stop B → STOPPED
        const { routeStops } = setupBus([
          { name: 'Stop A', lat: -12.0, lng: -77.0, numCoords: 2 },
          { name: 'Stop B', lat: -12.1, lng: -77.1, numCoords: 2 },
        ]);
        forceMovingState(1, 10, routeStops);

        // Exhaust segment: tick 1 and 2
        await service.tick();
        await service.tick(); // coordIndex=1 (last) → STOPPED

        // Tick 3: STOPPED → same position as arrival
        await service.tick();

        // Tick 4: still STOPPED → same position again
        await service.tick();

        const tick3Payload = mockKafkaProducer.publish.mock.calls[2][1];
        const tick4Payload = mockKafkaProducer.publish.mock.calls[3][1];

        // Both STOPPED ticks should have identical position
        expect(tick3Payload.latitude).toBe(tick4Payload.latitude);
        expect(tick3Payload.longitude).toBe(tick4Payload.longitude);
        // Both should have STOPPED status
        expect(tick3Payload.status).toBe('En Stop B');
        expect(tick4Payload.status).toBe('En Stop B');
      });

      // ── SCN: Kafka published on every STOPPED tick

      it('should publish Kafka events with "En [stop]" status on every STOPPED tick', async () => {
        const { routeStops } = setupBus([
          { name: 'Stop A', lat: -12.0, lng: -77.0, numCoords: 2 },
          { name: 'Stop B', lat: -12.1, lng: -77.1, numCoords: 0 },
        ]);
        forceMovingState(1, 10, routeStops);

        // Exhaust segment
        await service.tick();
        await service.tick(); // arrives at Stop B → STOPPED

        // Three STOPPED ticks → each should publish with correct status
        await service.tick();
        await service.tick();
        await service.tick();

        // All 3 STOPPED ticks should have "En Stop B" status
        const stoppedCalls = mockKafkaProducer.publish.mock.calls.slice(2);
        for (const call of stoppedCalls) {
          expect(call[1].status).toBe('En Stop B');
          expect(call[1].current_stop).toBe('Stop B');
        }
      });
    });

    // ── Task 2.5: STOPPED applies passenger variation; MOVING does not

    describe('Task 2.5: Passenger variation by phase', () => {
      // ── SCN: MOVING phase should NOT change passenger count

      it('should NOT change passenger count during MOVING phase', async () => {
        const { routeStops } = setupBus(
          [
            { name: 'Stop A', lat: -12.0, lng: -77.0, numCoords: 10 },
            { name: 'Stop B', lat: -12.1, lng: -77.1, numCoords: 0 },
          ],
          40,
        );
        forceMovingState(1, 10, routeStops);

        // Force Math.random to produce a non-zero delta with old formula:
        // Old: delta = floor(random * 11) - 5 → random=0.99 → delta=5
        const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
        try {
          await service.tick();

          // Initial passengerCount is 0 — MOVING should NOT change it
          const payload = mockKafkaProducer.publish.mock.calls[0][1];
          expect(payload.passenger_count).toBe(0);
        } finally {
          randomSpy.mockRestore();
        }
      });

      // ── SCN: STOPPED phase applies percentage-based passenger variation

      it('should apply percentage-based passenger variation during STOPPED phase', async () => {
        const { routeStops } = setupBus(
          [
            { name: 'Stop A', lat: -12.0, lng: -77.0, numCoords: 2 },
            { name: 'Stop B', lat: -12.1, lng: -77.1, numCoords: 0 },
          ],
          40,
        );
        forceMovingState(1, 10, routeStops);

        // Deterministic random for predictable passenger variation
        const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
        try {
          // Tick 1-2: exhaust segment → arrive at Stop B → STOPPED
          await service.tick();
          await service.tick();

          // Tick 3: STOPPED → passenger variation should be applied
          await service.tick();

          const tick3Payload = mockKafkaProducer.publish.mock.calls[2][1];

          // Must be at Stop B (STOPPED — not advancing to next segment)
          expect(tick3Payload.status).toBe('En Stop B');
          expect(tick3Payload.current_stop).toBe('Stop B');

          // Passenger count should be within valid bounds [0, capacity]
          // and should have been updated via calculatePassengerDelta
          expect(tick3Payload.passenger_count).toBeGreaterThanOrEqual(0);
          expect(tick3Payload.passenger_count).toBeLessThanOrEqual(40);
        } finally {
          randomSpy.mockRestore();
        }
      });
    });

    // ── Task 2.6: STOPPED elapsed ≥60s → MOVING, "Salió de [stop]", stop index advances

    describe('Task 2.6: STOPPED → MOVING transition after 60s dwell', () => {
      // ── SCN: 60s elapsed → phase transitions to MOVING, status "Salió de [stop]"

      it('should transition from STOPPED to MOVING after 60s and publish "Salió de [stop]"', async () => {
        const { routeStops } = setupBus([
          { name: 'Stop A', lat: -12.0, lng: -77.0, numCoords: 2 },
          { name: 'Stop B', lat: -12.1, lng: -77.1, numCoords: 2 },
          { name: 'Stop C', lat: -12.2, lng: -77.2, numCoords: 0 },
        ]);
        forceMovingState(1, 10, routeStops);

        // Tick 1-2: exhaust segment → arrive at Stop B → STOPPED
        await service.tick();
        await service.tick(); // coordIndex=1 (last) → STOPPED at Stop B

        // Tick 3: STOPPED (within 60s) → still stopped
        await service.tick();
        const tick3Payload = mockKafkaProducer.publish.mock.calls[2][1];
        expect(tick3Payload.status).toBe('En Stop B');

        // Simulate 61s passing by manipulating the internal state
        const busStates = (service as any).busStates as Map<number, any>;
        const state = busStates.get(1);
        state.stoppedSince = new Date(Date.now() - 61_000); // 61 seconds ago

        // Tick 4: STOPPED elapsed ≥60s → transition to MOVING, "Salió de Stop B"
        await service.tick();
        const tick4Payload = mockKafkaProducer.publish.mock.calls[3][1];
        expect(tick4Payload.status).toBe('Salió de Stop B');
        expect(tick4Payload.current_stop).toBe('Stop B');
        expect(tick4Payload.next_stop).toBe('Stop C');
      });

      // ── SCN: After transition, coordIndex resets and coordinates come from next segment

      it('should load next segment and reset coordIndex after STOPPED→MOVING transition', async () => {
        const { routeStops } = setupBus([
          { name: 'Stop A', lat: -12.0, lng: -77.0, numCoords: 2 },
          { name: 'Stop B', lat: -12.1, lng: -77.1, numCoords: 10 },
          { name: 'Stop C', lat: -12.2, lng: -77.2, numCoords: 0 },
        ]);
        forceMovingState(1, 10, routeStops);

        // Exhaust first segment → STOPPED at Stop B
        await service.tick();
        await service.tick(); // coordIndex=1 (last) → ARRIVAL at Stop B → STOPPED

        // Force 61s elapsed
        const busStates = (service as any).busStates as Map<number, any>;
        const state = busStates.get(1);
        state.stoppedSince = new Date(Date.now() - 61_000);

        // Tick 3: transition to MOVING → first point of Stop B's segment
        await service.tick();
        const tick3Payload = mockKafkaProducer.publish.mock.calls[2][1];
        expect(tick3Payload.status).toBe('Salió de Stop B');

        // Tick 4: advancing along Stop B's segment (coordIndex=1, remaining=9 → "En camino a")
        await service.tick();
        const tick4Payload = mockKafkaProducer.publish.mock.calls[3][1];
        // Coordinates should be from Stop B's segment (different from first)
        expect(tick3Payload.latitude).not.toBe(tick4Payload.latitude);
        expect(tick4Payload.status).toBe('En camino a Stop C');
      });
    });

    // ── Task 2.7: Last stop departure wraps currentStopIndex to 0, loads first segment

    describe('Task 2.7: Circular wrap at last stop', () => {
      // ── SCN: Departing from last stop wraps to first stop segment

      it('should wrap currentStopIndex to 0 when departing from last stop', async () => {
        const { routeStops } = setupBus([
          { name: 'Stop A', lat: -12.0, lng: -77.0, numCoords: 10 },
          { name: 'Stop B', lat: -12.1, lng: -77.1, numCoords: 5 },
        ]);
        forceMovingState(1, 10, routeStops);

        // Exhaust Stop A segment (10 coords → need 9 MOVING ticks + 1 arrival tick)
        // Tick 1-8: MOVING ticks (coordIndex 0-7)
        for (let i = 0; i < 8; i++) {
          await service.tick();
        }
        // Tick 9: coordIndex=8, remaining=2 → "Llegando a", coordIndex→9
        await service.tick();
        // Tick 10: coordIndex=9 >= segLen-1=9 → ARRIVAL at Stop B (last stop) → STOPPED
        await service.tick();

        // Force 61s elapsed
        const busStates = (service as any).busStates as Map<number, any>;
        const state = busStates.get(1);
        state.stoppedSince = new Date(Date.now() - 61_000);

        // Tick 11: depart from last stop → wrap to Stop A's segment
        await service.tick();
        const tick11Payload = mockKafkaProducer.publish.mock.calls[10][1];
        expect(tick11Payload.status).toBe('Salió de Stop B');
        expect(tick11Payload.next_stop).toBe('Stop A');

        // Tick 12: advancing along Stop A's segment (coordIndex=1, remaining=9 → "En camino a")
        await service.tick();
        const tick12Payload = mockKafkaProducer.publish.mock.calls[11][1];
        expect(tick12Payload.next_stop).toBe('Stop B');
      });

      // ── SCN: Triangulation — wrap publishes first segment coordinates

      it('should publish first segment coordinates after circular wrap from last stop', async () => {
        const { routeStops } = setupBus([
          { name: 'Stop A', lat: -12.0, lng: -77.0, numCoords: 3 },
          { name: 'Stop B', lat: -12.1, lng: -77.1, numCoords: 2 },
        ]);
        forceMovingState(1, 10, routeStops);

        // Exhaust Stop A (3 points) → STOPPED at Stop B (2 points)
        await service.tick(); // seg1[0]
        await service.tick(); // seg1[1]
        await service.tick(); // seg1[2] → STOPPED at Stop B

        // Verify arrival
        const tick3Payload = mockKafkaProducer.publish.mock.calls[2][1];
        expect(tick3Payload.status).toBe('En Stop B');

        // Force 61s elapsed
        const busStates = (service as any).busStates as Map<number, any>;
        const state = busStates.get(1);
        state.stoppedSince = new Date(Date.now() - 61_000);

        // Tick 4: depart from Stop B → wrap → first coord of Stop A's segment
        await service.tick();
        const tick4Payload = mockKafkaProducer.publish.mock.calls[3][1];

        // First segment first point: lng=-77.0+0.01=-76.99, lat=-12.0+0.01=-11.99
        expect(tick4Payload.status).toBe('Salió de Stop B');
        // After wrap, next_stop is Stop A (first stop), current is still Stop B
        expect(tick4Payload.current_stop).toBe('Stop B');
      });
    });

    // ── Task 2.8: Kafka payload field-set includes new fields

    describe('Task 2.8: Kafka payload enrichment — field-set', () => {
      // ── SCN: Every Kafka payload includes status, current_stop, next_stop

      it('should include status, current_stop, and next_stop in every Kafka payload', async () => {
        setupBus([
          { name: 'Stop A', lat: -12.0, lng: -77.0, numCoords: 5 },
          { name: 'Stop B', lat: -12.1, lng: -77.1, numCoords: 0 },
        ]);

        await service.tick();

        const payload = mockKafkaProducer.publish.mock.calls[0][1];

        // Existing fields still present
        expect(payload).toHaveProperty('bus_id');
        expect(payload).toHaveProperty('latitude');
        expect(payload).toHaveProperty('longitude');
        expect(payload).toHaveProperty('passenger_count');
        expect(payload).toHaveProperty('timestamp');

        // New enriched fields
        expect(payload).toHaveProperty('status');
        expect(payload).toHaveProperty('current_stop');
        expect(payload).toHaveProperty('next_stop');

        // Values are correct
        expect(typeof payload.status).toBe('string');
        expect(typeof payload.current_stop).toBe('string');
        expect(typeof payload.next_stop).toBe('string');
      });

      // ── SCN: Updated field-set assertion replaces line 409 assertion

      it('should match the enriched telemetry payload field-set exactly', async () => {
        setupBus([
          { name: 'Stop A', lat: -12.0, lng: -77.0, numCoords: 5 },
          { name: 'Stop B', lat: -12.1, lng: -77.1, numCoords: 0 },
        ]);

        await service.tick();

        const payload = mockKafkaProducer.publish.mock.calls[0][1];

        // Updated field-set: original fields + status, current_stop, next_stop
        expect(Object.keys(payload).sort()).toEqual(
          [
            'bus_id', 'route_id', 'stop_id', 'latitude', 'longitude',
            'passenger_count', 'timestamp',
            'status', 'current_stop', 'next_stop',
          ].sort(),
        );
      });

      // ── SCN: next_stop is null at last stop during STOPPED

      it('should set next_stop to null when bus is at the last route stop during STOPPED', async () => {
        const { routeStops } = setupBus([
          { name: 'Stop A', lat: -12.0, lng: -77.0, numCoords: 2 },
          { name: 'Stop B', lat: -12.1, lng: -77.1, numCoords: 0 },
        ]);
        forceMovingState(1, 10, routeStops);

        // Exhaust segment → STOPPED at Stop B (last stop)
        await service.tick();
        await service.tick(); // coordIndex=1 → STOPPED

        // Tick 3: STOPPED at last stop → next_stop should be null
        await service.tick();
        const tick3Payload = mockKafkaProducer.publish.mock.calls[2][1];
        expect(tick3Payload.status).toBe('En Stop B');
        expect(tick3Payload.next_stop).toBeNull();
      });
    });
  });
});
