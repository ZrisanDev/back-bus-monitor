import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DirectionsService } from '../directions.service';
import { Direction } from '../entities/direction.entity';
import { CreateDirectionDto } from '../dto/create-direction.dto';
import { UpdateDirectionDto } from '../dto/update-direction.dto';

describe('DirectionsService', () => {
  let service: DirectionsService;
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
        DirectionsService,
        {
          provide: getRepositoryToken(Direction),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DirectionsService>(DirectionsService);
  });

  // ── Helper ───────────────────────────────────────────────────────────────

  const makeDirection = (overrides: Partial<Direction> = {}): Direction => ({
    id: 1,
    code: 'NORTE_SUR',
    label_es: 'Norte → Sur',
    label_en: 'North → South',
    created_at: new Date('2025-01-01T00:00:00.000Z'),
    updated_at: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // findAll
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return all directions', async () => {
      const directions = [
        makeDirection({ id: 1, code: 'NORTE_SUR' }),
        makeDirection({ id: 2, code: 'SUR_NORTE', label_es: 'Sur → Norte', label_en: 'South → North' }),
      ];
      mockRepository.find.mockResolvedValue(directions);

      const result = await service.findAll();

      expect(result).toEqual(directions);
      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('NORTE_SUR');
      expect(result[1].code).toBe('SUR_NORTE');
    });

    it('should return empty array when no directions exist', async () => {
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
    it('should return direction when id exists', async () => {
      const direction = makeDirection({ id: 1 });
      mockRepository.findOneBy.mockResolvedValue(direction);

      const result = await service.findOne(1);

      expect(result).toEqual(direction);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('should return correct direction for different id', async () => {
      const direction = makeDirection({ id: 42, code: 'ESTE_OESTE' });
      mockRepository.findOneBy.mockResolvedValue(direction);

      const result = await service.findOne(42);

      expect(result.id).toBe(42);
      expect(result.code).toBe('ESTE_OESTE');
    });

    it('should throw NotFoundException when direction does not exist', async () => {
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
    const dto: CreateDirectionDto = {
      code: 'NORTE_SUR',
      label_es: 'Norte → Sur',
      label_en: 'North → South',
    };

    it('should create and return a new direction', async () => {
      const direction = makeDirection();
      mockRepository.findOneBy.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(direction);
      mockRepository.save.mockResolvedValue(direction);

      const result = await service.create(dto);

      expect(result).toEqual(direction);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ code: 'NORTE_SUR' });
      expect(mockRepository.create).toHaveBeenCalledWith(dto);
      expect(mockRepository.save).toHaveBeenCalledWith(direction);
    });

    it('should create a direction with different data', async () => {
      const otherDto: CreateDirectionDto = {
        code: 'ESTE_OESTE',
        label_es: 'Este → Oeste',
        label_en: 'East → West',
      };
      const direction = makeDirection({
        code: 'ESTE_OESTE',
        label_es: 'Este → Oeste',
        label_en: 'East → West',
      });
      mockRepository.findOneBy.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(direction);
      mockRepository.save.mockResolvedValue(direction);

      const result = await service.create(otherDto);

      expect(result.code).toBe('ESTE_OESTE');
      expect(result.label_es).toBe('Este → Oeste');
      expect(result.label_en).toBe('East → West');
    });

    it('should throw ConflictException when code already exists', async () => {
      const existing = makeDirection();
      mockRepository.findOneBy.mockResolvedValue(existing);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      await expect(service.create(dto)).rejects.toThrow(/ya existe.*NORTE_SUR/i);
    });

    it('should throw ConflictException with 409 status for duplicate code', async () => {
      const existing = makeDirection();
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
      const existing = makeDirection();
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
    const dto: UpdateDirectionDto = { label_es: 'Norte → Sur (editado)' };

    it('should update and return the direction', async () => {
      const existing = makeDirection();
      const updated = { ...existing, label_es: 'Norte → Sur (editado)' };
      mockRepository.findOneBy.mockResolvedValue(existing);
      mockRepository.save.mockResolvedValue(updated);

      const result = await service.update(1, dto);

      expect(result.label_es).toBe('Norte → Sur (editado)');
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when direction does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.update(999, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when updating code to existing one', async () => {
      const existing = makeDirection({ id: 1, code: 'NORTE_SUR' });
      const other = makeDirection({ id: 2, code: 'ESTE_OESTE' });
      mockRepository.findOneBy
        .mockResolvedValueOnce(existing)  // findOne for id
        .mockResolvedValueOnce(other);     // findOneBy for new code

      const updateDto: UpdateDirectionDto = { code: 'ESTE_OESTE' };

      await expect(service.update(1, updateDto)).rejects.toThrow(ConflictException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // remove
  // ═══════════════════════════════════════════════════════════════════════════

  describe('remove', () => {
    it('should remove and return the direction', async () => {
      const direction = makeDirection();
      mockRepository.findOneBy.mockResolvedValue(direction);
      mockRepository.remove.mockResolvedValue(direction);

      const result = await service.remove(1);

      expect(result).toEqual(direction);
      expect(mockRepository.remove).toHaveBeenCalledWith(direction);
    });

    it('should throw NotFoundException when direction does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
