import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DayTypesService } from '../day-types.service';
import { DayType } from '../entities/day-type.entity';
import { CreateDayTypeDto } from '../dto/create-day-type.dto';
import { UpdateDayTypeDto } from '../dto/update-day-type.dto';

describe('DayTypesService', () => {
  let service: DayTypesService;
  let mockRepository: {
    find: jest.Mock;
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DayTypesService,
        {
          provide: getRepositoryToken(DayType),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DayTypesService>(DayTypesService);
  });

  const makeDayType = (overrides: Partial<DayType> = {}): DayType => ({
    id: 1,
    code: 'LUNES_VIERNES',
    label_es: 'Lunes a Viernes',
    label_en: 'Monday to Friday',
    created_at: new Date('2025-01-01T00:00:00.000Z'),
    updated_at: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // findAll
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return all day types', async () => {
      const dayTypes = [
        makeDayType({ id: 1, code: 'LUNES_VIERNES' }),
        makeDayType({ id: 2, code: 'SABADO', label_es: 'Sábado', label_en: 'Saturday' }),
      ];
      mockRepository.find.mockResolvedValue(dayTypes);

      const result = await service.findAll();

      expect(result).toEqual(dayTypes);
      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('LUNES_VIERNES');
      expect(result[1].code).toBe('SABADO');
    });

    it('should return empty array when no day types exist', async () => {
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
    it('should return day type when id exists', async () => {
      const dayType = makeDayType({ id: 1 });
      mockRepository.findOneBy.mockResolvedValue(dayType);

      const result = await service.findOne(1);

      expect(result).toEqual(dayType);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('should return correct day type for different id', async () => {
      const dayType = makeDayType({ id: 3, code: 'DOMINGO' });
      mockRepository.findOneBy.mockResolvedValue(dayType);

      const result = await service.findOne(3);

      expect(result.id).toBe(3);
      expect(result.code).toBe('DOMINGO');
    });

    it('should throw NotFoundException when day type does not exist', async () => {
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
    const dto: CreateDayTypeDto = {
      code: 'LUNES_VIERNES',
      label_es: 'Lunes a Viernes',
      label_en: 'Monday to Friday',
    };

    it('should create and return a new day type', async () => {
      const dayType = makeDayType();
      mockRepository.findOneBy.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(dayType);
      mockRepository.save.mockResolvedValue(dayType);

      const result = await service.create(dto);

      expect(result).toEqual(dayType);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ code: 'LUNES_VIERNES' });
      expect(mockRepository.create).toHaveBeenCalledWith(dto);
      expect(mockRepository.save).toHaveBeenCalledWith(dayType);
    });

    it('should create a day type with different data', async () => {
      const otherDto: CreateDayTypeDto = {
        code: 'FERIADO',
        label_es: 'Feriado',
        label_en: 'Holiday',
      };
      const dayType = makeDayType({
        code: 'FERIADO',
        label_es: 'Feriado',
        label_en: 'Holiday',
      });
      mockRepository.findOneBy.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(dayType);
      mockRepository.save.mockResolvedValue(dayType);

      const result = await service.create(otherDto);

      expect(result.code).toBe('FERIADO');
      expect(result.label_es).toBe('Feriado');
      expect(result.label_en).toBe('Holiday');
    });

    it('should throw ConflictException when code already exists', async () => {
      const existing = makeDayType();
      mockRepository.findOneBy.mockResolvedValue(existing);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      await expect(service.create(dto)).rejects.toThrow(/ya existe.*LUNES_VIERNES/i);
    });

    it('should throw ConflictException with 409 status for duplicate code', async () => {
      const existing = makeDayType();
      mockRepository.findOneBy.mockResolvedValue(existing);

      try {
        await service.create(dto);
        fail('Expected ConflictException');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        expect((error as ConflictException).getStatus()).toBe(409);
      }
    });

    it('should not call save when code already exists', async () => {
      const existing = makeDayType();
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
    const dto: UpdateDayTypeDto = { label_es: 'Lunes a Viernes (editado)' };

    it('should update and return the day type', async () => {
      const existing = makeDayType();
      const updated = { ...existing, label_es: 'Lunes a Viernes (editado)' };
      mockRepository.findOneBy
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null);
      mockRepository.save.mockResolvedValue(updated);

      const result = await service.update(1, dto);

      expect(result.label_es).toBe('Lunes a Viernes (editado)');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when day type does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.update(999, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when updating code to existing one', async () => {
      const existing = makeDayType({ id: 1, code: 'LUNES_VIERNES' });
      const other = makeDayType({ id: 2, code: 'SABADO' });
      mockRepository.findOneBy
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(other);

      const updateDto: UpdateDayTypeDto = { code: 'SABADO' };

      await expect(service.update(1, updateDto)).rejects.toThrow(ConflictException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // remove
  // ═══════════════════════════════════════════════════════════════════════════

  describe('remove', () => {
    it('should remove and return the day type', async () => {
      const dayType = makeDayType();
      mockRepository.findOneBy.mockResolvedValue(dayType);
      mockRepository.remove.mockResolvedValue(dayType);

      const result = await service.remove(1);

      expect(result).toEqual(dayType);
      expect(mockRepository.remove).toHaveBeenCalledWith(dayType);
    });

    it('should throw NotFoundException when day type does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
