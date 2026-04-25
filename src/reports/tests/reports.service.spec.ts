import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ReportsService } from '../reports.service';
import { Report } from '../entities/report.entity';
import { Bus } from '../../buses/entities/bus.entity';
import { BusesService } from '../../buses/buses.service';
import { CreateReportDto } from '../dto/create-report.dto';

describe('ReportsService', () => {
  let service: ReportsService;
  let mockReportRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    query: jest.Mock;
  };
  let mockBusesService: {
    findOne: jest.Mock;
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
    latitude: -34.6,
    longitude: -58.38,
    passenger_count: 22,
    timestamp: new Date('2025-06-15T12:00:00.000Z'),
    created_at: new Date('2025-06-15T12:00:00.000Z'),
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

    mockBusesService = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getRepositoryToken(Report),
          useValue: mockReportRepository,
        },
        {
          provide: BusesService,
          useValue: mockBusesService,
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
      latitude: -34.6,
      longitude: -58.38,
      passenger_count: 22,
    };

    // ── SCN: Successful creation (201) ───────────────────────────────────

    it('should create and return a report for an existing bus', async () => {
      const bus = makeBus({ id: 10, capacity: 40 });
      const report = makeReport({ bus_id: 10, passenger_count: 22, bus });

      mockBusesService.findOne.mockResolvedValue(bus);
      mockReportRepository.create.mockReturnValue(report);
      mockReportRepository.save.mockResolvedValue(report);

      const result = await service.create(10, dto);

      expect(result).toEqual(report);
      expect(result.passenger_count).toBe(22);
      expect(mockBusesService.findOne).toHaveBeenCalledWith(10);
      expect(mockReportRepository.create).toHaveBeenCalled();
      expect(mockReportRepository.save).toHaveBeenCalled();
    });

    // ── SCN: Triangulation — different bus and data ──────────────────────

    it('should create report with different bus and passenger count', async () => {
      const bus = makeBus({ id: 5, capacity: 60 });
      const differentDto: CreateReportDto = {
        latitude: 40.7128,
        longitude: -74.006,
        passenger_count: 0,
      };
      const report = makeReport({
        bus_id: 5,
        passenger_count: 0,
        latitude: 40.7128,
        longitude: -74.006,
        bus,
      });

      mockBusesService.findOne.mockResolvedValue(bus);
      mockReportRepository.create.mockReturnValue(report);
      mockReportRepository.save.mockResolvedValue(report);

      const result = await service.create(5, differentDto);

      expect(result.bus_id).toBe(5);
      expect(result.passenger_count).toBe(0);
      expect(result.latitude).toBe(40.7128);
    });

    // ── SCN: Bus not found (404) ─────────────────────────────────────────

    it('should throw NotFoundException when bus does not exist', async () => {
      mockBusesService.findOne.mockRejectedValue(
        new NotFoundException('Bus con ID 999 no encontrado'),
      );

      await expect(service.create(999, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockReportRepository.create).not.toHaveBeenCalled();
      expect(mockReportRepository.save).not.toHaveBeenCalled();
    });

    // ── SCN: NotFoundException has 404 status ────────────────────────────

    it('should throw NotFoundException with 404 status', async () => {
      mockBusesService.findOne.mockRejectedValue(
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
        latitude: -34.6,
        longitude: -58.38,
        passenger_count: 41,
      };

      mockBusesService.findOne.mockResolvedValue(bus);

      await expect(service.create(10, exceedDto)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    // ── SCN: 422 has required message ────────────────────────────────────

    it('should include required message in 422 error', async () => {
      const bus = makeBus({ id: 10, capacity: 40 });
      const exceedDto: CreateReportDto = {
        latitude: -34.6,
        longitude: -58.38,
        passenger_count: 50,
      };

      mockBusesService.findOne.mockResolvedValue(bus);

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
        latitude: -34.6,
        longitude: -58.38,
        passenger_count: 41,
      };

      mockBusesService.findOne.mockResolvedValue(bus);

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
  // findBusCapacity — Task 2.4
  // ═══════════════════════════════════════════════════════════════════════

  describe('findBusCapacity', () => {
    // ── SCN: Returns bus capacity ─────────────────────────────────────────

    it('should return capacity for existing bus', async () => {
      const bus = makeBus({ id: 1, capacity: 40 });
      mockBusesService.findOne.mockResolvedValue(bus);

      const result = await service.findBusCapacity(1);

      expect(result).toBe(40);
      expect(mockBusesService.findOne).toHaveBeenCalledWith(1);
    });

    // ── SCN: Triangulation — different capacity ───────────────────────────

    it('should return different capacity for another bus', async () => {
      const bus = makeBus({ id: 5, capacity: 80 });
      mockBusesService.findOne.mockResolvedValue(bus);

      const result = await service.findBusCapacity(5);

      expect(result).toBe(80);
    });

    // ── SCN: Throws NotFoundException for non-existent bus ────────────────

    it('should throw NotFoundException for non-existent bus', async () => {
      mockBusesService.findOne.mockRejectedValue(
        new NotFoundException('Bus con ID 999 no encontrado'),
      );

      await expect(service.findBusCapacity(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // getLastStatusAll — Task 2.5
  // ═══════════════════════════════════════════════════════════════════════

  describe('getLastStatusAll', () => {
    // ── SCN: Returns status for buses with reports ────────────────────────

    it('should return latest status for all buses with reports', async () => {
      const rawResults = [
        {
          bus_id: '1',
          bus_code: 'BUS-001',
          bus_capacity: 40,
          latitude: '-34.60',
          longitude: '-58.38',
          passenger_count: 22,
          timestamp: new Date('2025-06-15T12:00:00.000Z'),
        },
      ];
      mockReportRepository.query.mockResolvedValue(rawResults);

      const result = await service.getLastStatusAll();

      expect(result).toHaveLength(1);
      expect(result[0].bus_id).toBe(1);
      expect(result[0].bus_code).toBe('BUS-001');
      expect(result[0].bus_capacity).toBe(40);
      expect(result[0].latitude).toBe(-34.6);
      expect(result[0].passenger_count).toBe(22);
    });

    // ── SCN: Buses without reports have null values ───────────────────────

    it('should include buses without reports with null fields', async () => {
      const rawResults = [
        {
          bus_id: '1',
          bus_code: 'BUS-001',
          bus_capacity: 40,
          latitude: '-34.60',
          longitude: '-58.38',
          passenger_count: 22,
          timestamp: new Date('2025-06-15T12:00:00.000Z'),
        },
        {
          bus_id: '2',
          bus_code: 'BUS-002',
          bus_capacity: 60,
          latitude: null,
          longitude: null,
          passenger_count: null,
          timestamp: null,
        },
      ];
      mockReportRepository.query.mockResolvedValue(rawResults);

      const result = await service.getLastStatusAll();

      expect(result).toHaveLength(2);
      expect(result[1].bus_id).toBe(2);
      expect(result[1].bus_code).toBe('BUS-002');
      expect(result[1].bus_capacity).toBe(60);
      expect(result[1].latitude).toBeNull();
      expect(result[1].longitude).toBeNull();
      expect(result[1].passenger_count).toBeNull();
      expect(result[1].timestamp).toBeNull();
    });

    // ── SCN: Triangulation — numeric IDs are normalized ───────────────────

    it('should normalize BIGINT string IDs to numbers', async () => {
      const rawResults = [
        {
          bus_id: '42',
          bus_code: 'BUS-042',
          bus_capacity: 50,
          latitude: '10.5',
          longitude: '-20.3',
          passenger_count: 10,
          timestamp: new Date('2025-06-15T14:00:00.000Z'),
        },
      ];
      mockReportRepository.query.mockResolvedValue(rawResults);

      const result = await service.getLastStatusAll();

      expect(result[0].bus_id).toBe(42);
      expect(typeof result[0].bus_id).toBe('number');
    });

    // ── SCN: Empty result when no buses exist ─────────────────────────────

    it('should return empty array when no buses exist', async () => {
      mockReportRepository.query.mockResolvedValue([]);

      const result = await service.getLastStatusAll();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });
});
