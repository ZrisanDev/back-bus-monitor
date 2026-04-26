import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RoutesService } from '../routes.service';
import { Route } from '../entities/route.entity';
import { CreateRouteDto } from '../dto/create-route.dto';
import { UpdateRouteDto } from '../dto/update-route.dto';

describe('RoutesService', () => {
  let service: RoutesService;
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
        RoutesService,
        {
          provide: getRepositoryToken(Route),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<RoutesService>(RoutesService);
  });

  const makeRoute = (overrides: Partial<Route> = {}): Route => ({
    id: 1,
    name: 'Línea 1',
    description: 'Main route',
    created_at: new Date('2025-01-01T00:00:00.000Z'),
    updated_at: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // findAll
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return all routes', async () => {
      const routes = [
        makeRoute({ id: 1, name: 'Línea 1' }),
        makeRoute({ id: 2, name: 'Línea 2', description: 'Secondary route' }),
      ];
      mockRepository.find.mockResolvedValue(routes);

      const result = await service.findAll();

      expect(result).toEqual(routes);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Línea 1');
      expect(result[1].name).toBe('Línea 2');
    });

    it('should return empty array when no routes exist', async () => {
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
    it('should return route when id exists', async () => {
      const route = makeRoute({ id: 1 });
      mockRepository.findOneBy.mockResolvedValue(route);

      const result = await service.findOne(1);

      expect(result).toEqual(route);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('should return correct route for different id', async () => {
      const route = makeRoute({ id: 42, name: 'Línea 42' });
      mockRepository.findOneBy.mockResolvedValue(route);

      const result = await service.findOne(42);

      expect(result.id).toBe(42);
      expect(result.name).toBe('Línea 42');
    });

    it('should throw NotFoundException when route does not exist', async () => {
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
    const dto: CreateRouteDto = { name: 'Línea 1', description: 'Main route' };

    it('should create and return a new route', async () => {
      const route = makeRoute();
      mockRepository.findOneBy.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(route);
      mockRepository.save.mockResolvedValue(route);

      const result = await service.create(dto);

      expect(result).toEqual(route);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ name: 'Línea 1' });
      expect(mockRepository.create).toHaveBeenCalledWith(dto);
      expect(mockRepository.save).toHaveBeenCalledWith(route);
    });

    it('should create a route with different data', async () => {
      const otherDto: CreateRouteDto = { name: 'Línea 99' };
      const route = makeRoute({ name: 'Línea 99', description: null });
      mockRepository.findOneBy.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(route);
      mockRepository.save.mockResolvedValue(route);

      const result = await service.create(otherDto);

      expect(result.name).toBe('Línea 99');
      expect(result.description).toBeNull();
    });

    it('should throw ConflictException when name already exists', async () => {
      const existing = makeRoute();
      mockRepository.findOneBy.mockResolvedValue(existing);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      await expect(service.create(dto)).rejects.toThrow(/ya existe.*Línea 1/i);
    });

    it('should throw ConflictException with 409 status for duplicate name', async () => {
      const existing = makeRoute();
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
      const existing = makeRoute();
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
    const dto: UpdateRouteDto = { description: 'Updated description' };

    it('should update and return the route', async () => {
      const existing = makeRoute();
      const updated = { ...existing, description: 'Updated description' };
      mockRepository.findOneBy.mockResolvedValue(existing);
      mockRepository.save.mockResolvedValue(updated);

      const result = await service.update(1, dto);

      expect(result.description).toBe('Updated description');
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when route does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.update(999, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when updating name to existing one', async () => {
      const existing = makeRoute({ id: 1, name: 'Línea 1' });
      const other = makeRoute({ id: 2, name: 'Línea 2' });
      mockRepository.findOneBy
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(other);

      const updateDto: UpdateRouteDto = { name: 'Línea 2' };

      await expect(service.update(1, updateDto)).rejects.toThrow(ConflictException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // remove
  // ═══════════════════════════════════════════════════════════════════════════

  describe('remove', () => {
    it('should remove and return the route', async () => {
      const route = makeRoute();
      mockRepository.findOneBy.mockResolvedValue(route);
      mockRepository.remove.mockResolvedValue(route);

      const result = await service.remove(1);

      expect(result).toEqual(route);
      expect(mockRepository.remove).toHaveBeenCalledWith(route);
    });

    it('should throw NotFoundException when route does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
