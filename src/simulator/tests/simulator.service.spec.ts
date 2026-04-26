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
  // Pure functions — advanceToNextStop, varyPassengerCount
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

  describe('varyPassengerCount (pure)', () => {
    // ── SCN: Clamps to 0 minimum ────────────────────────────────────────

    it('should clamp to 0 when delta would go negative', () => {
      expect(SimulatorService.varyPassengerCount(2, -5, 40)).toBe(0);
    });

    // ── SCN: Clamps to capacity maximum ─────────────────────────────────

    it('should clamp to capacity when delta would exceed it', () => {
      expect(SimulatorService.varyPassengerCount(38, 5, 40)).toBe(40);
    });

    // ── SCN: Normal delta within bounds ─────────────────────────────────

    it('should apply delta when result is within bounds', () => {
      expect(SimulatorService.varyPassengerCount(20, 5, 40)).toBe(25);
    });

    // ── SCN: Negative delta within bounds ───────────────────────────────

    it('should apply negative delta when result stays positive', () => {
      expect(SimulatorService.varyPassengerCount(20, -5, 40)).toBe(15);
    });

    // ── SCN: Zero delta keeps same count ────────────────────────────────

    it('should keep same count when delta is 0', () => {
      expect(SimulatorService.varyPassengerCount(20, 0, 40)).toBe(20);
    });

    // ── SCN: Triangulation — different capacity ─────────────────────────

    it('should respect different capacity values', () => {
      expect(SimulatorService.varyPassengerCount(55, 10, 60)).toBe(60);
      expect(SimulatorService.varyPassengerCount(55, -5, 60)).toBe(50);
    });
  });
});
