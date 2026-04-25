import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from '../reports.controller';
import { ReportsService } from '../reports.service';
import { CreateReportDto } from '../dto/create-report.dto';
import { Report } from '../entities/report.entity';
import { Bus } from '../../buses/entities/bus.entity';

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: ReportsService;

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
    latitude: -34.6,
    longitude: -58.38,
    passenger_count: 22,
    timestamp: new Date('2025-06-15T12:00:00.000Z'),
    created_at: new Date('2025-06-15T12:00:00.000Z'),
    bus: makeBus(),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: {
            create: jest.fn(),
            findAllByBus: jest.fn(),
            getLastStatusAll: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    service = module.get<ReportsService>(ReportsService);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // POST /buses/:id/reports
  // ═══════════════════════════════════════════════════════════════════════

  describe('create', () => {
    // ── SCN: Delegates to service with parsed busId ──────────────────────

    it('should call service.create with parsed id and dto', async () => {
      const dto: CreateReportDto = {
        latitude: -34.6,
        longitude: -58.38,
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
        latitude: 40.7128,
        longitude: -74.006,
        passenger_count: 0,
      };
      const report = makeReport({
        bus_id: 42,
        latitude: 40.7128,
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
    // ── SCN: Delegates to service.getLastStatusAll ────────────────────────

    it('should return service.getLastStatusAll result', async () => {
      const statusData = [
        {
          bus_id: 1,
          bus_code: 'BUS-001',
          bus_capacity: 40,
          latitude: -34.6,
          longitude: -58.38,
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
          latitude: -34.6,
          longitude: -58.38,
          passenger_count: 22,
          timestamp: new Date('2025-06-15T12:00:00.000Z'),
        },
        {
          bus_id: 2,
          bus_code: 'BUS-002',
          bus_capacity: 60,
          latitude: null,
          longitude: null,
          passenger_count: null,
          timestamp: null,
        },
      ];
      jest.spyOn(service, 'getLastStatusAll').mockResolvedValue(statusData);

      const result = await controller.getLastStatusAll();

      expect(result).toHaveLength(2);
      expect(result[1].latitude).toBeNull();
      expect(result[1].bus_code).toBe('BUS-002');
    });
  });
});
