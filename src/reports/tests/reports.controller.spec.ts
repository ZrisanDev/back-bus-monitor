import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from '../reports.controller';
import { CreateReportDto } from '../dto/create-report.dto';
import { Report } from '../entities/report.entity';
import { Bus } from '../../buses/entities/bus.entity';

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: any;

  // ── Helpers ────────────────────────────────────────────────────────────

  const makeBus = (overrides: Partial<Bus> = {}): Bus => ({
    id: 1,
    code: 'BUS-001',
    capacity: 40,
    created_at: new Date('2025-01-01T00:00:00.000Z'),
    updated_at: new Date('2025-01-01T00:00:00.000Z'),
    reports: [],
    ...overrides,
  });

  const makeReport = (overrides: Partial<Report> = {}): Report => ({
    id: 1,
    bus_id: 1,
    passenger_count: 22,
    timestamp: new Date('2025-06-15T12:00:00.000Z'),
    created_at: new Date('2025-06-15T12:00:00.000Z'),
    route_id: null,
    stop_id: null,
    route: null,
    stop: null,
    bus: makeBus(),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: 'IReportsService',
          useValue: {
            create: jest.fn(),
            findAllByBus: jest.fn(),
            getLastStatusAll: jest.fn(),
            getBackfillPreview: jest.fn(),
            executeBackfill: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    service = module.get('IReportsService');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // POST /buses/:id/reports
  // ═══════════════════════════════════════════════════════════════════════

  describe('create', () => {
    // ── SCN: Delegates to service with parsed busId ──────────────────────

    it('should call service.create with parsed id and dto', async () => {
      const dto: CreateReportDto = {
        passenger_count: 22,
      };
      const report = makeReport({ bus_id: 10 });
      jest.spyOn(service, 'create').mockResolvedValue(report);

      const result = await controller.create('10', dto);

      expect(result).toEqual(report);
      expect(service.create).toHaveBeenCalledWith(10, dto);
    });

    // ── SCN: Triangulation — different id and data ───────────────────────

    it('should parse different string ids to numbers', async () => {
      const dto: CreateReportDto = {
        passenger_count: 0,
      };
      const report = makeReport({
        bus_id: 42,
        passenger_count: 0,
      });
      jest.spyOn(service, 'create').mockResolvedValue(report);

      const result = await controller.create('42', dto);

      expect(service.create).toHaveBeenCalledWith(42, dto);
      expect(result.bus_id).toBe(42);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // GET /buses/status
  // ═══════════════════════════════════════════════════════════════════════

  describe('getLastStatusAll', () => {
    // ── SCN: Delegates to service.getLastStatusAll ───────────────────────

    it('should return service.getLastStatusAll result', async () => {
      const statusData = [
        {
          bus_id: 1,
          bus_code: 'BUS-001',
          bus_capacity: 40,
          passenger_count: 22,
          timestamp: new Date('2025-06-15T12:00:00.000Z'),
        },
      ];
      jest.spyOn(service, 'getLastStatusAll').mockResolvedValue(statusData);

      const result = await controller.getLastStatusAll();

      expect(result).toEqual(statusData);
      expect(service.getLastStatusAll).toHaveBeenCalledTimes(1);
    });

    // ── SCN: Triangulation — mixed buses with and without reports ─────────

    it('should return mixed results including null entries', async () => {
      const statusData = [
        {
          bus_id: 1,
          bus_code: 'BUS-001',
          bus_capacity: 40,
          passenger_count: 22,
          timestamp: new Date('2025-06-15T12:00:00.000Z'),
        },
        {
          bus_id: 2,
          bus_code: 'BUS-002',
          bus_capacity: 60,
          passenger_count: null,
          timestamp: null,
        },
      ];
      jest.spyOn(service, 'getLastStatusAll').mockResolvedValue(statusData);

      const result = await controller.getLastStatusAll();

      expect(result).toHaveLength(2);
      expect(result[1].passenger_count).toBeNull();
      expect(result[1].bus_code).toBe('BUS-002');
    });

    // ── SCN: TASK-013 — enriched response includes route/stop fields ─────

    it('should return enriched status with route and stop context', async () => {
      const statusData = [
        {
          bus_id: 1,
          bus_code: 'BUS-001',
          bus_capacity: 40,
          passenger_count: 22,
          timestamp: new Date('2025-06-15T12:00:00.000Z'),
          route_id: 5,
          route_name: 'Expreso 5',
          stop_id: 3,
          stop_name: 'UNI',
        },
      ];
      jest.spyOn(service, 'getLastStatusAll').mockResolvedValue(statusData);

      const result = await controller.getLastStatusAll();

      expect(result).toHaveLength(1);
      expect(result[0].route_id).toBe(5);
      expect(result[0].route_name).toBe('Expreso 5');
      expect(result[0].stop_id).toBe(3);
      expect(result[0].stop_name).toBe('UNI');
    });

    // ── SCN: TASK-013 — enriched with null route/stop for unassigned bus ──

    it('should return null route/stop fields for buses without assignment', async () => {
      const statusData = [
        {
          bus_id: 2,
          bus_code: 'BUS-002',
          bus_capacity: 60,
          passenger_count: null,
          timestamp: null,
          route_id: null,
          route_name: null,
          stop_id: null,
          stop_name: null,
        },
      ];
      jest.spyOn(service, 'getLastStatusAll').mockResolvedValue(statusData);

      const result = await controller.getLastStatusAll();

      expect(result[0].route_id).toBeNull();
      expect(result[0].route_name).toBeNull();
      expect(result[0].stop_id).toBeNull();
      expect(result[0].stop_name).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TASK-011: GET /reports/backfill-preview
  // ═══════════════════════════════════════════════════════════════════════

  describe('getBackfillPreview', () => {
    // ── SCN: Delegates to service.getBackfillPreview ────────────────────

    it('should return service.getBackfillPreview result', async () => {
      const previewData = {
        total_reports: 150,
        with_route_and_stop: 0,
        missing_route_id: 150,
        missing_stop_id: 150,
        sample_affected: [
          { id: 1, bus_id: 5, passenger_count: 22, timestamp: '2025-06-15T12:00:00.000Z' },
          { id: 2, bus_id: 3, passenger_count: 15, timestamp: '2025-06-15T13:00:00.000Z' },
        ],
      };
      jest.spyOn(service, 'getBackfillPreview').mockResolvedValue(previewData);

      const result = await controller.getBackfillPreview();

      expect(result).toEqual(previewData);
      expect(service.getBackfillPreview).toHaveBeenCalledTimes(1);
    });

    // ── SCN: Triangulation — all reports already backfilled ─────────────

    it('should return zero missing when all reports are backfilled', async () => {
      const previewData = {
        total_reports: 50,
        with_route_and_stop: 50,
        missing_route_id: 0,
        missing_stop_id: 0,
        sample_affected: [],
      };
      jest.spyOn(service, 'getBackfillPreview').mockResolvedValue(previewData);

      const result = await controller.getBackfillPreview();

      expect(result.total_reports).toBe(50);
      expect(result.missing_route_id).toBe(0);
      expect(result.missing_stop_id).toBe(0);
      expect(result.sample_affected).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TASK-012: POST /reports/backfill-execute
  // ═══════════════════════════════════════════════════════════════════════

  describe('executeBackfill', () => {
    // ── SCN: Delegates to service.executeBackfill ───────────────────────

    it('should return service.executeBackfill result', async () => {
      const backfillResult = {
        updated_count: 50,
        remaining_nulls: 0,
        message: 'Backfill complete: 50 reports updated, 0 remaining nulls',
      };
      jest.spyOn(service, 'executeBackfill').mockResolvedValue(backfillResult);

      const result = await controller.executeBackfill();

      expect(result).toEqual(backfillResult);
      expect(service.executeBackfill).toHaveBeenCalledTimes(1);
    });

    // ── SCN: Triangulation — partial backfill ───────────────────────────

    it('should return partial results with remaining nulls', async () => {
      const backfillResult = {
        updated_count: 5,
        remaining_nulls: 3,
        message: 'Backfill complete: 5 reports updated, 3 remaining nulls',
      };
      jest.spyOn(service, 'executeBackfill').mockResolvedValue(backfillResult);

      const result = await controller.executeBackfill();

      expect(result.updated_count).toBe(5);
      expect(result.remaining_nulls).toBe(3);
    });
  });
});