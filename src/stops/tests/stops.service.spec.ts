import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { StopsService } from '../stops.service';
import { Stop } from '../entities/stop.entity';
import { CreateStopDto } from '../dto/create-stop.dto';
import { UpdateStopDto } from '../dto/update-stop.dto';

describe('StopsService', () => {
  let service: StopsService;
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
        StopsService,
        {
          provide: getRepositoryToken(Stop),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<StopsService>(StopsService);
  });

  const makeStop = (overrides: Partial<Stop> = {}): Stop => ({
    id: 1,
    name: 'Parada Central',
    latitude: -34.603722,
    longitude: -58.381592,
    created_at: new Date('2025-01-01T00:00:00.000Z'),
    updated_at: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // findAll
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return all stops', async () => {
      const stops = [
        makeStop({ id: 1, name: 'Parada Central' }),
        makeStop({ id: 2, name: 'Parada Norte', latitude: -34.5, longitude: -58.4 }),
      ];
      mockRepository.find.mockResolvedValue(stops);

      const result = await service.findAll();

      expect(result).toEqual(stops);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Parada Central');
      expect(result[1].name).toBe('Parada Norte');
    });

    it('should return empty array when no stops exist', async () => {
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
    it('should return stop when id exists', async () => {
      const stop = makeStop({ id: 1 });
      mockRepository.findOneBy.mockResolvedValue(stop);

      const result = await service.findOne(1);

      expect(result).toEqual(stop);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('should return correct stop for different id', async () => {
      const stop = makeStop({ id: 42, name: 'Parada 42' });
      mockRepository.findOneBy.mockResolvedValue(stop);

      const result = await service.findOne(42);

      expect(result.id).toBe(42);
      expect(result.name).toBe('Parada 42');
    });

    it('should throw NotFoundException when stop does not exist', async () => {
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
    const dto: CreateStopDto = {
      name: 'Parada Central',
      latitude: -34.603722,
      longitude: -58.381592,
    };

    it('should create and return a new stop', async () => {
      const stop = makeStop();
      mockRepository.findOneBy.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(stop);
      mockRepository.save.mockResolvedValue(stop);

      const result = await service.create(dto);

      expect(result).toEqual(stop);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ name: 'Parada Central' });
      expect(mockRepository.create).toHaveBeenCalledWith(dto);
      expect(mockRepository.save).toHaveBeenCalledWith(stop);
    });

    it('should create a stop with different data', async () => {
      const otherDto: CreateStopDto = {
        name: 'Parada Sur',
        latitude: -34.7,
        longitude: -58.5,
      };
      const stop = makeStop({
        name: 'Parada Sur',
        latitude: -34.7,
        longitude: -58.5,
      });
      mockRepository.findOneBy.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(stop);
      mockRepository.save.mockResolvedValue(stop);

      const result = await service.create(otherDto);

      expect(result.name).toBe('Parada Sur');
      expect(result.latitude).toBe(-34.7);
      expect(result.longitude).toBe(-58.5);
    });

    it('should throw ConflictException when name already exists', async () => {
      const existing = makeStop();
      mockRepository.findOneBy.mockResolvedValue(existing);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      await expect(service.create(dto)).rejects.toThrow(/ya existe.*Parada Central/i);
    });

    it('should throw ConflictException with 409 status for duplicate name', async () => {
      const existing = makeStop();
      mockRepository.findOneBy.mockResolvedValue(existing);

      try {
        await service.create(dto);
        fail('Expected ConflictException');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        expect((error as ConflictException).getStatus()).toBe(409);
      }
    });

    it('should not call save when name already exists', async () => {
      const existing = makeStop();
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
    const dto: UpdateStopDto = { name: 'Parada Central (editada)' };

    it('should update and return the stop', async () => {
      const existing = makeStop();
      const updated = { ...existing, name: 'Parada Central (editada)' };
      mockRepository.findOneBy
        .mockResolvedValueOnce(existing)   // findOne by id
        .mockResolvedValueOnce(null);      // no duplicate name
      mockRepository.save.mockResolvedValue(updated);

      const result = await service.update(1, dto);

      expect(result.name).toBe('Parada Central (editada)');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when stop does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.update(999, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when updating name to existing one', async () => {
      const existing = makeStop({ id: 1, name: 'Parada Central' });
      const other = makeStop({ id: 2, name: 'Parada Norte' });
      mockRepository.findOneBy
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(other);

      const updateDto: UpdateStopDto = { name: 'Parada Norte' };

      await expect(service.update(1, updateDto)).rejects.toThrow(ConflictException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // remove
  // ═══════════════════════════════════════════════════════════════════════════

  describe('remove', () => {
    it('should remove and return the stop', async () => {
      const stop = makeStop();
      mockRepository.findOneBy.mockResolvedValue(stop);
      mockRepository.remove.mockResolvedValue(stop);

      const result = await service.remove(1);

      expect(result).toEqual(stop);
      expect(mockRepository.remove).toHaveBeenCalledWith(stop);
    });

    it('should throw NotFoundException when stop does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
