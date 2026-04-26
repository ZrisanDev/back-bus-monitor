import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { HolidaysService } from '../holidays.service';
import { Holiday } from '../entities/holiday.entity';
import { CreateHolidayDto } from '../dto/create-holiday.dto';
import { UpdateHolidayDto } from '../dto/update-holiday.dto';

describe('HolidaysService', () => {
  let service: HolidaysService;
  let mockRepository: {
    find: jest.Mock;
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    merge: jest.Mock;
  };

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      merge: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HolidaysService,
        {
          provide: getRepositoryToken(Holiday),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<HolidaysService>(HolidaysService);
  });

  // ── Helper ───────────────────────────────────────────────────────────────

  const makeHoliday = (overrides: Partial<Holiday> = {}): Holiday => ({
    id: 1,
    date: '2026-12-25',
    description: 'Navidad',
    created_at: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // findAll
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return all holidays', async () => {
      const holidays = [
        makeHoliday({ id: 1, date: '2026-12-25' }),
        makeHoliday({ id: 2, date: '2026-07-09', description: 'Independencia' }),
      ];
      mockRepository.find.mockResolvedValue(holidays);

      const result = await service.findAll();

      expect(result).toEqual(holidays);
      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2026-12-25');
      expect(result[1].date).toBe('2026-07-09');
    });

    it('should return empty array when no holidays exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // findOne
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findOne', () => {
    it('should return holiday when id exists', async () => {
      const holiday = makeHoliday({ id: 1 });
      mockRepository.findOneBy.mockResolvedValue(holiday);

      const result = await service.findOne(1);

      expect(result).toEqual(holiday);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('should return correct holiday for different id', async () => {
      const holiday = makeHoliday({ id: 42, date: '2026-01-01', description: 'Año Nuevo' });
      mockRepository.findOneBy.mockResolvedValue(holiday);

      const result = await service.findOne(42);

      expect(result.id).toBe(42);
      expect(result.description).toBe('Año Nuevo');
    });

    it('should throw NotFoundException when holiday does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

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

  // ═══════════════════════════════════════════════════════════════════════════
  // create
  // ═══════════════════════════════════════════════════════════════════════════

  describe('create', () => {
    const dto: CreateHolidayDto = {
      date: '2026-12-25',
      description: 'Navidad',
    };

    it('should create and return a new holiday', async () => {
      const holiday = makeHoliday();
      mockRepository.findOneBy.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(holiday);
      mockRepository.save.mockResolvedValue(holiday);

      const result = await service.create(dto);

      expect(result).toEqual(holiday);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ date: '2026-12-25' });
      expect(mockRepository.create).toHaveBeenCalledWith(dto);
      expect(mockRepository.save).toHaveBeenCalledWith(holiday);
    });

    it('should create a holiday with different data', async () => {
      const otherDto: CreateHolidayDto = {
        date: '2026-07-09',
        description: 'Día de la Independencia',
      };
      const holiday = makeHoliday({
        date: '2026-07-09',
        description: 'Día de la Independencia',
      });
      mockRepository.findOneBy.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(holiday);
      mockRepository.save.mockResolvedValue(holiday);

      const result = await service.create(otherDto);

      expect(result.date).toBe('2026-07-09');
      expect(result.description).toBe('Día de la Independencia');
    });

    it('should throw ConflictException when date already exists', async () => {
      const existing = makeHoliday();
      mockRepository.findOneBy.mockResolvedValue(existing);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      await expect(service.create(dto)).rejects.toThrow(/ya existe.*2026-12-25/i);
    });

    it('should throw ConflictException with 409 status for duplicate date', async () => {
      const existing = makeHoliday();
      mockRepository.findOneBy.mockResolvedValue(existing);

      try {
        await service.create(dto);
        fail('Expected ConflictException');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        expect((error as ConflictException).getStatus()).toBe(409);
      }
    });

    it('should not call save when date already exists', async () => {
      const existing = makeHoliday();
      mockRepository.findOneBy.mockResolvedValue(existing);

      await expect(service.create(dto)).rejects.toThrow();
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // update
  // ═══════════════════════════════════════════════════════════════════════════

  describe('update', () => {
    const dto: UpdateHolidayDto = { description: 'Navidad Editada' };

    it('should update and return the holiday', async () => {
      const existing = makeHoliday();
      const updated = { ...existing, description: 'Navidad Editada' };
      mockRepository.findOneBy.mockResolvedValue(existing);
      mockRepository.save.mockResolvedValue(updated);

      const result = await service.update(1, dto);

      expect(result.description).toBe('Navidad Editada');
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when holiday does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.update(999, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when updating date to existing one', async () => {
      const existing = makeHoliday({ id: 1, date: '2026-12-25' });
      const other = makeHoliday({ id: 2, date: '2026-07-09' });
      mockRepository.findOneBy
        .mockResolvedValueOnce(existing)  // findOne for id
        .mockResolvedValueOnce(other);     // findOneBy for new date

      const updateDto: UpdateHolidayDto = { date: '2026-07-09' };

      await expect(service.update(1, updateDto)).rejects.toThrow(ConflictException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // remove
  // ═══════════════════════════════════════════════════════════════════════════

  describe('remove', () => {
    it('should remove and return the holiday', async () => {
      const holiday = makeHoliday();
      mockRepository.findOneBy.mockResolvedValue(holiday);
      mockRepository.remove.mockResolvedValue(holiday);

      const result = await service.remove(1);

      expect(result).toEqual(holiday);
      expect(mockRepository.remove).toHaveBeenCalledWith(holiday);
    });

    it('should throw NotFoundException when holiday does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
