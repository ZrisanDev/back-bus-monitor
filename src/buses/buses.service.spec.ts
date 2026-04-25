import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { BusesService } from './buses.service';
import { Bus } from './entities/bus.entity';
import { CreateBusDto } from './dto/create-bus.dto';

describe('BusesService', () => {
  let service: BusesService;
  let mockRepository: {
    find: jest.Mock;
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusesService,
        {
          provide: getRepositoryToken(Bus),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<BusesService>(BusesService);
  });

  // ── Helper to create a Bus instance ──────────────────────────────────

  const makeBus = (overrides: Partial<Bus> = {}): Bus => ({
    id: 1,
    code: 'BUS-001',
    capacity: 40,
    created_at: new Date('2025-01-01T00:00:00.000Z'),
    updated_at: new Date('2025-01-01T00:00:00.000Z'),
    reports: [],
    ...overrides,
  });

  // ═══════════════════════════════════════════════════════════════════════
  // findByCode
  // ═══════════════════════════════════════════════════════════════════════

  describe('findByCode', () => {
    // ── SCN: Returns bus when found ─────────────────────────────────────

    it('should return bus when code exists', async () => {
      const bus = makeBus({ code: 'BUS-001' });
      mockRepository.findOneBy.mockResolvedValue(bus);

      const result = await service.findByCode('BUS-001');

      expect(result).toEqual(bus);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        code: 'BUS-001',
      });
    });

    // ── SCN: Returns null when not found ────────────────────────────────

    it('should return null when code does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      const result = await service.findByCode('NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // create
  // ═══════════════════════════════════════════════════════════════════════

  describe('create', () => {
    const dto: CreateBusDto = { code: 'BUS-001', capacity: 40 };

    // ── SCN: Creates bus successfully ───────────────────────────────────

    it('should create and return a new bus', async () => {
      const bus = makeBus();
      mockRepository.findOneBy.mockResolvedValue(null); // no duplicate
      mockRepository.create.mockReturnValue(bus);
      mockRepository.save.mockResolvedValue(bus);

      const result = await service.create(dto);

      expect(result).toEqual(bus);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        code: 'BUS-001',
      });
      expect(mockRepository.create).toHaveBeenCalledWith(dto);
      expect(mockRepository.save).toHaveBeenCalledWith(bus);
    });

    // ── SCN: Triangulation — different bus data ─────────────────────────

    it('should create a bus with different data', async () => {
      const otherDto: CreateBusDto = { code: 'BUS-999', capacity: 80 };
      const bus = makeBus({ code: 'BUS-999', capacity: 80 });
      mockRepository.findOneBy.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(bus);
      mockRepository.save.mockResolvedValue(bus);

      const result = await service.create(otherDto);

      expect(result.code).toBe('BUS-999');
      expect(result.capacity).toBe(80);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        code: 'BUS-999',
      });
    });

    // ── SCN: Duplicate code → 409 ConflictException ─────────────────────

    it('should throw ConflictException when code already exists', async () => {
      const existing = makeBus();
      mockRepository.findOneBy.mockResolvedValue(existing);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      await expect(service.create(dto)).rejects.toThrow(
        /ya existe.*BUS-001/i,
      );
    });

    // ── SCN: ConflictException has 409 status ───────────────────────────

    it('should throw ConflictException with 409 status for duplicate code', async () => {
      const existing = makeBus();
      mockRepository.findOneBy.mockResolvedValue(existing);

      try {
        await service.create(dto);
        fail('Expected ConflictException');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        expect((error as ConflictException).getStatus()).toBe(409);
      }
    });

    // ── SCN: Does NOT save when duplicate exists ────────────────────────

    it('should not call save when code already exists', async () => {
      const existing = makeBus();
      mockRepository.findOneBy.mockResolvedValue(existing);

      await expect(service.create(dto)).rejects.toThrow();
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // findAll
  // ═══════════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    // ── SCN: Returns list of buses ──────────────────────────────────────

    it('should return all buses', async () => {
      const buses = [
        makeBus({ id: 1, code: 'BUS-001' }),
        makeBus({ id: 2, code: 'BUS-002', capacity: 60 }),
      ];
      mockRepository.find.mockResolvedValue(buses);

      const result = await service.findAll();

      expect(result).toEqual(buses);
      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('BUS-001');
      expect(result[1].code).toBe('BUS-002');
    });

    // ── SCN: Triangulation — empty list ─────────────────────────────────

    it('should return empty array when no buses exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // findOne
  // ═══════════════════════════════════════════════════════════════════════

  describe('findOne', () => {
    // ── SCN: Returns bus when found ─────────────────────────────────────

    it('should return bus when id exists', async () => {
      const bus = makeBus({ id: 1 });
      mockRepository.findOneBy.mockResolvedValue(bus);

      const result = await service.findOne(1);

      expect(result).toEqual(bus);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    // ── SCN: Triangulation — different id ───────────────────────────────

    it('should return correct bus for different id', async () => {
      const bus = makeBus({ id: 42, code: 'BUS-042' });
      mockRepository.findOneBy.mockResolvedValue(bus);

      const result = await service.findOne(42);

      expect(result.id).toBe(42);
      expect(result.code).toBe('BUS-042');
    });

    // ── SCN: NotFoundException when bus does not exist ──────────────────

    it('should throw NotFoundException when bus does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    // ── SCN: NotFoundException has correct message ──────────────────────

    it('should throw NotFoundException with descriptive message including id', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      try {
        await service.findOne(999);
        fail('Expected NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect((error as NotFoundException).getStatus()).toBe(404);
        expect((error as NotFoundException).message).toMatch(/999/);
      }
    });
  });
});
