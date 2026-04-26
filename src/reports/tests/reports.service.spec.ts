import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ReportsService } from '../reports.service';
import { Report } from '../entities/report.entity';
import { Bus } from '../../buses/entities/bus.entity';
import { CreateReportDto } from '../dto/create-report.dto';
import { LastStatusQueryService } from '../services/last-status-query.service';
import { BackfillPreviewService } from '../services/backfill-preview.service';
import { BackfillExecuteService } from '../services/backfill-execute.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let mockReportRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    query: jest.Mock;
  };
  let mockBusReader: {
    findOne: jest.Mock;
  };
  let mockLastStatusQueryService: {
    execute: jest.Mock;
  };
  let mockCapacityValidator: {
    validate: jest.Mock;
  };
  let mockBackfillPreviewService: {
    execute: jest.Mock;
  };
  let mockBackfillExecuteService: {
    execute: jest.Mock;
  };

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
    mockReportRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      query: jest.fn(),
    };

    mockBusReader = {
      findOne: jest.fn(),
    };

    mockLastStatusQueryService = {
      execute: jest.fn(),
    };

    mockBackfillPreviewService = {
      execute: jest.fn(),
    };

    mockBackfillExecuteService = {
      execute: jest.fn(),
    };

    // Mock validator that replicates MaxPassengersValidator behavior
    mockCapacityValidator = {
      validate: jest.fn((dto: CreateReportDto, bus: Bus) => {
        if (dto.passenger_count > bus.capacity) {
          throw new UnprocessableEntityException(
            `La cantidad de pasajeros (${dto.passenger_count}) excede la capacidad del bus (${bus.capacity})`,
          );
        }
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getRepositoryToken(Report),
          useValue: mockReportRepository,
        },
        {
          provide: 'IBusReader',
          useValue: mockBusReader,
        },
        {
          provide: LastStatusQueryService,
          useValue: mockLastStatusQueryService,
        },
        {
          provide: BackfillPreviewService,
          useValue: mockBackfillPreviewService,
        },
        {
          provide: BackfillExecuteService,
          useValue: mockBackfillExecuteService,
        },
        {
          provide: 'ICapacityValidator',
          useValue: mockCapacityValidator,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // create — Task 2.2
  // ═══════════════════════════════════════════════════════════════════════

  describe('create', () => {
    const dto: CreateReportDto = {
      passenger_count: 22,
    };

    // ── SCN: Successful creation (201) ───────────────────────────────────

    it('should create and return a report for an existing bus', async () => {
      const bus = makeBus({ id: 10, capacity: 40 });
      const report = makeReport({ bus_id: 10, passenger_count: 22, bus });

      mockBusReader.findOne.mockResolvedValue(bus);
      mockReportRepository.create.mockReturnValue(report);
      mockReportRepository.save.mockResolvedValue(report);

      const result = await service.create(10, dto);

      expect(result).toEqual(report);
      expect(result.passenger_count).toBe(22);
      expect(mockBusReader.findOne).toHaveBeenCalledWith(10);
      expect(mockReportRepository.create).toHaveBeenCalled();
      expect(mockReportRepository.save).toHaveBeenCalled();
    });

    // ── SCN: Triangulation — different bus and data ──────────────────────

    it('should create report with different bus and passenger count', async () => {
      const bus = makeBus({ id: 5, capacity: 60 });
      const differentDto: CreateReportDto = {
        passenger_count: 0,
      };
      const report = makeReport({
        bus_id: 5,
        passenger_count: 0,
        bus,
      });

      mockBusReader.findOne.mockResolvedValue(bus);
      mockReportRepository.create.mockReturnValue(report);
      mockReportRepository.save.mockResolvedValue(report);

      const result = await service.create(5, differentDto);

      expect(result.bus_id).toBe(5);
      expect(result.passenger_count).toBe(0);
    });

    // ── SCN: Bus not found (404) ─────────────────────────────────────────

    it('should throw NotFoundException when bus does not exist', async () => {
      mockBusReader.findOne.mockRejectedValue(
        new NotFoundException('Bus con ID 999 no encontrado'),
      );

      await expect(service.create(999, dto)).rejects.toThrow(NotFoundException);
      expect(mockReportRepository.create).not.toHaveBeenCalled();
      expect(mockReportRepository.save).not.toHaveBeenCalled();
    });

    // ── SCN: NotFoundException has 404 status ────────────────────────────

    it('should throw NotFoundException with 404 status', async () => {
      mockBusReader.findOne.mockRejectedValue(
        new NotFoundException('Bus con ID 999 no encontrado'),
      );

      try {
        await service.create(999, dto);
        fail('Expected NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect((error as NotFoundException).getStatus()).toBe(404);
      }
    });

    // ── SCN: Capacity exceeded (422) ─────────────────────────────────────

    it('should throw UnprocessableEntityException when passenger_count exceeds capacity', async () => {
      const bus = makeBus({ id: 10, capacity: 40 });
      const exceedDto: CreateReportDto = {
        passenger_count: 41,
      };

      mockBusReader.findOne.mockResolvedValue(bus);

      await expect(service.create(10, exceedDto)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    // ── SCN: 422 has required message ────────────────────────────────────

    it('should include required message in 422 error', async () => {
      const bus = makeBus({ id: 10, capacity: 40 });
      const exceedDto: CreateReportDto = {
        passenger_count: 50,
      };

      mockBusReader.findOne.mockResolvedValue(bus);

      try {
        await service.create(10, exceedDto);
        fail('Expected UnprocessableEntityException');
      } catch (error) {
        expect(error).toBeInstanceOf(UnprocessableEntityException);
        expect((error as UnprocessableEntityException).getStatus()).toBe(422);
        expect((error as UnprocessableEntityException).message).toMatch(
          /cantidad de pasajeros.*50.*capacidad.*40/i,
        );
      }
    });

    // ── SCN: Does NOT persist when capacity exceeded ─────────────────────

    it('should not save report when capacity is exceeded', async () => {
      const bus = makeBus({ id: 10, capacity: 40 });
      const exceedDto: CreateReportDto = {
        passenger_count: 41,
      };

      mockBusReader.findOne.mockResolvedValue(bus);

      await expect(service.create(10, exceedDto)).rejects.toThrow();
      expect(mockReportRepository.create).not.toHaveBeenCalled();
      expect(mockReportRepository.save).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // findAllByBus — Task 2.3
  // ═══════════════════════════════════════════════════════════════════════

  describe('findAllByBus', () => {
    // ── SCN: Returns all reports for a bus ────────────────────────────────

    it('should return all reports for a given bus', async () => {
      const reports = [
        makeReport({ id: 1, bus_id: 10, passenger_count: 20 }),
        makeReport({ id: 2, bus_id: 10, passenger_count: 25 }),
        makeReport({ id: 3, bus_id: 10, passenger_count: 30 }),
      ];
      mockReportRepository.find.mockResolvedValue(reports);

      const result = await service.findAllByBus(10);

      expect(result).toEqual(reports);
      expect(result).toHaveLength(3);
      expect(result[0].passenger_count).toBe(20);
      expect(result[2].passenger_count).toBe(30);
    });

    // ── SCN: Triangulation — empty result ─────────────────────────────────

    it('should return empty array when bus has no reports', async () => {
      mockReportRepository.find.mockResolvedValue([]);

      const result = await service.findAllByBus(99);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    // ── SCN: Historical integrity — multiple records preserved ────────────

    it('should preserve historical records without overwriting', async () => {
      const reports = [
        makeReport({
          id: 1,
          bus_id: 10,
          passenger_count: 10,
          timestamp: new Date('2025-06-15T10:00:00.000Z'),
        }),
        makeReport({
          id: 2,
          bus_id: 10,
          passenger_count: 15,
          timestamp: new Date('2025-06-15T11:00:00.000Z'),
        }),
      ];
      mockReportRepository.find.mockResolvedValue(reports);

      const result = await service.findAllByBus(10);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // getLastStatusAll — delegates to LastStatusQueryService
  // ═══════════════════════════════════════════════════════════════════════

  describe('getLastStatusAll', () => {
    // ── SCN: Returns status for buses with reports ────────────────────────

    it('should return latest status for all buses with reports', async () => {
      const mappedResults = [
        {
          bus_id: 1,
          bus_code: 'BUS-001',
          bus_capacity: 40,
          passenger_count: 22,
          timestamp: new Date('2025-06-15T12:00:00.000Z'),
        },
      ];
      mockLastStatusQueryService.execute.mockResolvedValue(mappedResults);

      const result = await service.getLastStatusAll();

      expect(result).toHaveLength(1);
      expect(result[0].bus_id).toBe(1);
      expect(result[0].bus_code).toBe('BUS-001');
      expect(result[0].bus_capacity).toBe(40);
      expect(result[0].passenger_count).toBe(22);
      expect(mockLastStatusQueryService.execute).toHaveBeenCalledTimes(1);
    });

    // ── SCN: Buses without reports have null values ───────────────────────

    it('should include buses without reports with null fields', async () => {
      const mappedResults = [
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
      mockLastStatusQueryService.execute.mockResolvedValue(mappedResults);

      const result = await service.getLastStatusAll();

      expect(result).toHaveLength(2);
      expect(result[1].bus_id).toBe(2);
      expect(result[1].bus_code).toBe('BUS-002');
      expect(result[1].bus_capacity).toBe(60);
      expect(result[1].passenger_count).toBeNull();
      expect(result[1].timestamp).toBeNull();
    });

    // ── SCN: Triangulation — numeric IDs are normalized ───────────────────

    it('should normalize BIGINT string IDs to numbers', async () => {
      const mappedResults = [
        {
          bus_id: 42,
          bus_code: 'BUS-042',
          bus_capacity: 50,
          passenger_count: 10,
          timestamp: new Date('2025-06-15T14:00:00.000Z'),
        },
      ];
      mockLastStatusQueryService.execute.mockResolvedValue(mappedResults);

      const result = await service.getLastStatusAll();

      expect(result[0].bus_id).toBe(42);
      expect(typeof result[0].bus_id).toBe('number');
    });

    // ── SCN: Empty result when no buses exist ─────────────────────────────

    it('should return empty array when no buses exist', async () => {
      mockLastStatusQueryService.execute.mockResolvedValue([]);

      const result = await service.getLastStatusAll();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    // ── SCN: Delegates to LastStatusQueryService ──────────────────────────

    it('should delegate to lastStatusQueryService.execute()', async () => {
      const mappedResults = [{ bus_id: 1, bus_code: 'BUS-001' }];
      mockLastStatusQueryService.execute.mockResolvedValue(mappedResults);

      await service.getLastStatusAll();

      expect(mockLastStatusQueryService.execute).toHaveBeenCalledTimes(1);
      expect(mockReportRepository.query).not.toHaveBeenCalled();
    });

    // ── SCN: TASK-013 — enriched response includes route/stop context ─────

    it('should return enriched status with route and stop context', async () => {
      const mappedResults = [
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
      mockLastStatusQueryService.execute.mockResolvedValue(mappedResults);

      const result = await service.getLastStatusAll();

      expect(result[0].route_id).toBe(5);
      expect(result[0].route_name).toBe('Expreso 5');
      expect(result[0].stop_id).toBe(3);
      expect(result[0].stop_name).toBe('UNI');
    });

    // ── SCN: TASK-013 — null route/stop when no assignment ────────────────

    it('should return null route/stop fields for unassigned buses', async () => {
      const mappedResults = [
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
      mockLastStatusQueryService.execute.mockResolvedValue(mappedResults);

      const result = await service.getLastStatusAll();

      expect(result[0].route_id).toBeNull();
      expect(result[0].route_name).toBeNull();
      expect(result[0].stop_id).toBeNull();
      expect(result[0].stop_name).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TASK-010: route_id/stop_id pass-through in create
  // ═══════════════════════════════════════════════════════════════════════

  describe('create with route_id/stop_id (TASK-010)', () => {
    // ── SCN: create passes route_id and stop_id to repository ────────────

    it('should create a report with route_id and stop_id', async () => {
      const bus = makeBus({ id: 10, capacity: 40 });
      const dtoWithRoute: CreateReportDto = {
        passenger_count: 22,
        route_id: 5,
        stop_id: 15,
      };
      const report = makeReport({
        bus_id: 10,
        passenger_count: 22,
        route_id: 5,
        stop_id: 15,
        bus,
      });

      mockBusReader.findOne.mockResolvedValue(bus);
      mockReportRepository.create.mockReturnValue(report);
      mockReportRepository.save.mockResolvedValue(report);

      const result = await service.create(10, dtoWithRoute);

      expect(result.route_id).toBe(5);
      expect(result.stop_id).toBe(15);
      expect(mockReportRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          bus_id: 10,
          passenger_count: 22,
          route_id: 5,
          stop_id: 15,
        }),
      );
    });

    // ── SCN: create works without route_id/stop_id (legacy) ──────────────

    it('should create a report without route_id and stop_id (nullable)', async () => {
      const bus = makeBus({ id: 1, capacity: 40 });
      const dtoLegacy: CreateReportDto = {
        passenger_count: 15,
      };
      const report = makeReport({
        bus_id: 1,
        passenger_count: 15,
        route_id: null,
        stop_id: null,
        bus,
      });

      mockBusReader.findOne.mockResolvedValue(bus);
      mockReportRepository.create.mockReturnValue(report);
      mockReportRepository.save.mockResolvedValue(report);

      const result = await service.create(1, dtoLegacy);

      expect(result.route_id).toBeNull();
      expect(result.stop_id).toBeNull();
    });

    // ── SCN: Triangulation — different route/stop IDs ─────────────────────

    it('should create a report with different route_id and stop_id', async () => {
      const bus = makeBus({ id: 3, capacity: 50 });
      const dtoWithRoute: CreateReportDto = {
        passenger_count: 10,
        route_id: 99,
        stop_id: 200,
      };
      const report = makeReport({
        bus_id: 3,
        passenger_count: 10,
        route_id: 99,
        stop_id: 200,
        bus,
      });

      mockBusReader.findOne.mockResolvedValue(bus);
      mockReportRepository.create.mockReturnValue(report);
      mockReportRepository.save.mockResolvedValue(report);

      const result = await service.create(3, dtoWithRoute);

      expect(result.route_id).toBe(99);
      expect(result.stop_id).toBe(200);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TASK-011: getBackfillPreview — delegates to BackfillPreviewService
  // ═══════════════════════════════════════════════════════════════════════

  describe('getBackfillPreview', () => {
    // ── SCN: Delegates to BackfillPreviewService ─────────────────────────

    it('should delegate to backfillPreviewService.execute()', async () => {
      const previewResult = {
        total_reports: 150,
        with_route_and_stop: 0,
        missing_route_id: 150,
        missing_stop_id: 150,
        sample_affected: [],
      };
      mockBackfillPreviewService.execute.mockResolvedValue(previewResult);

      const result = await service.getBackfillPreview();

      expect(result).toEqual(previewResult);
      expect(mockBackfillPreviewService.execute).toHaveBeenCalledTimes(1);
    });

    // ── SCN: Triangulation — all backfilled ─────────────────────────────

    it('should return zero missing when fully backfilled', async () => {
      const previewResult = {
        total_reports: 50,
        with_route_and_stop: 50,
        missing_route_id: 0,
        missing_stop_id: 0,
        sample_affected: [],
      };
      mockBackfillPreviewService.execute.mockResolvedValue(previewResult);

      const result = await service.getBackfillPreview();

      expect(result.missing_route_id).toBe(0);
      expect(result.missing_stop_id).toBe(0);
      expect(result.with_route_and_stop).toBe(50);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TASK 2.1: getLastStatusAll — with filter param passthrough
  // ═══════════════════════════════════════════════════════════════════════

  describe('getLastStatusAll (with filter)', () => {
    // ── SCN: Passes filter to LastStatusQueryService ─────────────────────

    it('should pass filter parameter to lastStatusQueryService', async () => {
      mockLastStatusQueryService.execute.mockResolvedValue([]);

      await service.getLastStatusAll('full');

      expect(mockLastStatusQueryService.execute).toHaveBeenCalledWith('full');
    });

    // ── SCN: No filter passes undefined ──────────────────────────────────

    it('should pass undefined when no filter is provided', async () => {
      mockLastStatusQueryService.execute.mockResolvedValue([]);

      await service.getLastStatusAll();

      expect(mockLastStatusQueryService.execute).toHaveBeenCalledWith(undefined);
    });

    // ── SCN: Triangulation — active filter ───────────────────────────────

    it('should pass active filter correctly', async () => {
      mockLastStatusQueryService.execute.mockResolvedValue([]);

      await service.getLastStatusAll('active');

      expect(mockLastStatusQueryService.execute).toHaveBeenCalledWith('active');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TASK 2.2: findReportsByBus — paginated history
  // ═══════════════════════════════════════════════════════════════════════

  describe('findReportsByBus', () => {
    // ── SCN: Returns paginated results with metadata ─────────────────────

    it('should return paginated reports with metadata', async () => {
      const bus = makeBus({ id: 10, capacity: 40 });
      mockBusReader.findOne.mockResolvedValue(bus);
      mockReportRepository.findAndCount = jest.fn().mockResolvedValue([[], 0]);

      const result = await service.findReportsByBus(10, 1, 20);

      expect(result).toEqual({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
    });

    // ── SCN: Triangulation — page 2 with results ─────────────────────────

    it('should return correct page of results', async () => {
      const bus = makeBus({ id: 5, capacity: 50 });
      const reports = [
        makeReport({ id: 21, bus_id: 5 }),
        makeReport({ id: 20, bus_id: 5 }),
      ];
      mockBusReader.findOne.mockResolvedValue(bus);
      mockReportRepository.findAndCount = jest.fn().mockResolvedValue([reports, 25]);

      const result = await service.findReportsByBus(5, 2, 10);

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.page).toBe(2);
    });

    // ── SCN: 404 for non-existent bus ────────────────────────────────────

    it('should throw NotFoundException for non-existent bus', async () => {
      mockBusReader.findOne.mockRejectedValue(
        new NotFoundException('Bus con ID 999 no encontrado'),
      );

      await expect(service.findReportsByBus(999, 1, 20)).rejects.toThrow(
        NotFoundException,
      );
    });

    // ── SCN: Date range filtering ────────────────────────────────────────

    it('should pass date range filters to query', async () => {
      const bus = makeBus({ id: 1, capacity: 40 });
      mockBusReader.findOne.mockResolvedValue(bus);
      mockReportRepository.findAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.findReportsByBus(1, 1, 20, '2025-01-01', '2025-12-31');

      expect(mockReportRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            bus_id: 1,
            timestamp: expect.anything(),
          }),
        }),
      );
    });

    // ── SCN: Only from date ──────────────────────────────────────────────

    it('should filter with only from date', async () => {
      const bus = makeBus({ id: 1, capacity: 40 });
      mockBusReader.findOne.mockResolvedValue(bus);
      mockReportRepository.findAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.findReportsByBus(1, 1, 20, '2025-06-01');

      expect(mockReportRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            bus_id: 1,
          }),
        }),
      );
    });

    // ── SCN: Only to date ────────────────────────────────────────────────

    it('should filter with only to date', async () => {
      const bus = makeBus({ id: 1, capacity: 40 });
      mockBusReader.findOne.mockResolvedValue(bus);
      mockReportRepository.findAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.findReportsByBus(1, 1, 20, undefined, '2025-12-31');

      expect(mockReportRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            bus_id: 1,
          }),
        }),
      );
    });

    // ── SCN: No date range returns all for bus ───────────────────────────

    it('should return all reports for bus without date filters', async () => {
      const bus = makeBus({ id: 1, capacity: 40 });
      mockBusReader.findOne.mockResolvedValue(bus);
      mockReportRepository.findAndCount = jest.fn().mockResolvedValue([[], 0]);

      await service.findReportsByBus(1, 1, 20);

      const callArgs = mockReportRepository.findAndCount.mock.calls[0][0];
      expect(callArgs.where).toEqual({ bus_id: 1 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TASK-012: executeBackfill — delegates to BackfillExecuteService
  // ═══════════════════════════════════════════════════════════════════════

  describe('executeBackfill', () => {
    // ── SCN: Delegates to BackfillExecuteService ─────────────────────────

    it('should delegate to backfillExecuteService.execute()', async () => {
      const backfillResult = {
        updated_count: 50,
        remaining_nulls: 0,
        message: 'Backfill complete: 50 reports updated, 0 remaining nulls',
      };
      mockBackfillExecuteService.execute.mockResolvedValue(backfillResult);

      const result = await service.executeBackfill();

      expect(result).toEqual(backfillResult);
      expect(mockBackfillExecuteService.execute).toHaveBeenCalledTimes(1);
    });

    // ── SCN: Triangulation — partial backfill ───────────────────────────

    it('should return partial backfill results', async () => {
      const backfillResult = {
        updated_count: 5,
        remaining_nulls: 3,
        message: 'Backfill complete: 5 reports updated, 3 remaining nulls',
      };
      mockBackfillExecuteService.execute.mockResolvedValue(backfillResult);

      const result = await service.executeBackfill();

      expect(result.updated_count).toBe(5);
      expect(result.remaining_nulls).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TASK 4.2: createFromTelemetry — creates report from Kafka telemetry
  // ═══════════════════════════════════════════════════════════════════════

  describe('createFromTelemetry', () => {
    // ── SCN: Creates report from telemetry data ──────────────────────────

    it('should create a report from telemetry payload', async () => {
      const bus = makeBus({ id: 1, capacity: 40 });
      const report = makeReport({
        bus_id: 1,
        passenger_count: 25,
        route_id: 10,
        stop_id: 100,
        latitude: -12.04,
        longitude: -77.03,
        bus,
      });

      mockBusReader.findOne.mockResolvedValue(bus);
      mockReportRepository.create.mockReturnValue(report);
      mockReportRepository.save.mockResolvedValue(report);

      const result = await service.createFromTelemetry(1, {
        passenger_count: 25,
        route_id: 10,
        stop_id: 100,
        latitude: -12.04,
        longitude: -77.03,
      });

      expect(result.bus_id).toBe(1);
      expect(result.passenger_count).toBe(25);
      expect(result.route_id).toBe(10);
      expect(result.stop_id).toBe(100);
      expect(mockReportRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          bus_id: 1,
          passenger_count: 25,
          route_id: 10,
          stop_id: 100,
          latitude: -12.04,
          longitude: -77.03,
        }),
      );
    });

    // ── SCN: Triangulation — different bus and telemetry ──────────────────

    it('should create report with different telemetry values', async () => {
      const bus = makeBus({ id: 5, capacity: 60 });
      const report = makeReport({
        bus_id: 5,
        passenger_count: 10,
        route_id: 20,
        stop_id: 200,
        latitude: -12.1,
        longitude: -77.1,
        bus,
      });

      mockBusReader.findOne.mockResolvedValue(bus);
      mockReportRepository.create.mockReturnValue(report);
      mockReportRepository.save.mockResolvedValue(report);

      const result = await service.createFromTelemetry(5, {
        passenger_count: 10,
        route_id: 20,
        stop_id: 200,
        latitude: -12.1,
        longitude: -77.1,
      });

      expect(result.bus_id).toBe(5);
      expect(result.passenger_count).toBe(10);
    });

    // ── SCN: Rejects unknown bus (404) ───────────────────────────────────

    it('should throw NotFoundException for unknown bus', async () => {
      mockBusReader.findOne.mockRejectedValue(
        new NotFoundException('Bus con ID 999 no encontrado'),
      );

      await expect(
        service.createFromTelemetry(999, {
          passenger_count: 10,
          route_id: 1,
          stop_id: 1,
          latitude: -12.0,
          longitude: -77.0,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    // ── SCN: Rejects capacity violation (422) ────────────────────────────

    it('should throw UnprocessableEntityException when passenger_count exceeds capacity', async () => {
      const bus = makeBus({ id: 1, capacity: 40 });
      mockBusReader.findOne.mockResolvedValue(bus);

      await expect(
        service.createFromTelemetry(1, {
          passenger_count: 50,
          route_id: 1,
          stop_id: 1,
          latitude: -12.0,
          longitude: -77.0,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});