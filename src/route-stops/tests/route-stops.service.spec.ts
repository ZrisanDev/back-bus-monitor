import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { RouteStopsService } from '../route-stops.service';
import { RouteStop } from '../entities/route-stop.entity';
import { CreateRouteStopDto } from '../dto/create-route-stop.dto';
import { UpdateRouteStopDto } from '../dto/update-route-stop.dto';
import { Route } from '../../routes/entities/route.entity';
import { Stop } from '../../stops/entities/stop.entity';

describe('RouteStopsService', () => {
  let service: RouteStopsService;
  let mockRepository: {
    find: jest.Mock;
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    merge: jest.Mock;
    count: jest.Mock;
    query: jest.Mock;
  };

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      merge: jest.fn(),
      count: jest.fn(),
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteStopsService,
        {
          provide: getRepositoryToken(RouteStop),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<RouteStopsService>(RouteStopsService);
  });

  // ── Helper ───────────────────────────────────────────────────────────────

  const makeRouteStop = (overrides: Partial<RouteStop> = {}): RouteStop => ({
    id: 1,
    route_id: 10,
    stop_id: 20,
    stop_order: 1,
    segment_geometry: null,
    created_at: new Date('2025-01-01T00:00:00.000Z'),
    updated_at: new Date('2025-01-01T00:00:00.000Z'),
    route: {} as Route,
    stop: {} as Stop,
    ...overrides,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // findAll
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return all route stops', async () => {
      const stops = [
        makeRouteStop({ id: 1, stop_order: 1 }),
        makeRouteStop({ id: 2, stop_id: 21, stop_order: 2 }),
      ];
      mockRepository.find.mockResolvedValue(stops);

      const result = await service.findAll();

      expect(result).toEqual(stops);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no route stops exist', async () => {
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
    it('should return route stop when id exists', async () => {
      const rs = makeRouteStop({ id: 1 });
      mockRepository.findOneBy.mockResolvedValue(rs);

      const result = await service.findOne(1);

      expect(result).toEqual(rs);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('should return correct route stop for different id', async () => {
      const rs = makeRouteStop({ id: 42, stop_order: 5 });
      mockRepository.findOneBy.mockResolvedValue(rs);

      const result = await service.findOne(42);

      expect(result.id).toBe(42);
      expect(result.stop_order).toBe(5);
    });

    it('should throw NotFoundException when route stop does not exist', async () => {
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
    const dto: CreateRouteStopDto = {
      route_id: 10,
      stop_id: 20,
      stop_order: 1,
    };

    it('should create and return a new route stop', async () => {
      const rs = makeRouteStop();
      mockRepository.findOneBy.mockResolvedValue(null); // no duplicate
      mockRepository.create.mockReturnValue(rs);
      mockRepository.save.mockResolvedValue(rs);
      // count for sequential validation (first stop)
      mockRepository.count.mockResolvedValue(0);

      const result = await service.create(dto);

      expect(result).toEqual(rs);
      expect(mockRepository.create).toHaveBeenCalledWith(dto);
      expect(mockRepository.save).toHaveBeenCalledWith(rs);
    });

    it('should create a route stop with different data', async () => {
      const otherDto: CreateRouteStopDto = {
        route_id: 5,
        stop_id: 15,
        stop_order: 3,
      };
      const rs = makeRouteStop({
        route_id: 5,
        stop_id: 15,
        stop_order: 3,
      });
      mockRepository.findOneBy.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(rs);
      mockRepository.save.mockResolvedValue(rs);
      mockRepository.count.mockResolvedValue(2); // already has 2 stops

      const result = await service.create(otherDto);

      expect(result.route_id).toBe(5);
      expect(result.stop_id).toBe(15);
      expect(result.stop_order).toBe(3);
    });

    it('should throw ConflictException when (route_id, stop_id) already exists', async () => {
      const existing = makeRouteStop();
      mockRepository.findOneBy.mockResolvedValue(existing);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException with 409 status for duplicate combination', async () => {
      const existing = makeRouteStop();
      mockRepository.findOneBy.mockResolvedValue(existing);

      try {
        await service.create(dto);
        fail('Expected ConflictException');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        expect((error as ConflictException).getStatus()).toBe(409);
      }
    });

    it('should throw ConflictException when (route_id, stop_order) already exists', async () => {
      mockRepository.findOneBy
        .mockResolvedValueOnce(null) // no (route, stop) duplicate
        .mockResolvedValueOnce(makeRouteStop({ stop_id: 99 })); // (route, order) duplicate

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should not call save when combination already exists', async () => {
      const existing = makeRouteStop();
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
    it('should update and return the route stop', async () => {
      const existing = makeRouteStop();
      const updated = { ...existing, stop_order: 2 };
      mockRepository.findOneBy.mockResolvedValue(existing);
      mockRepository.save.mockResolvedValue(updated);

      const result = await service.update(1, { stop_order: 2 });

      expect(result.stop_order).toBe(2);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when route stop does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.update(999, { stop_order: 2 })).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // remove
  // ═══════════════════════════════════════════════════════════════════════════

  describe('remove', () => {
    it('should remove and return the route stop', async () => {
      const rs = makeRouteStop();
      mockRepository.findOneBy.mockResolvedValue(rs);
      mockRepository.remove.mockResolvedValue(rs);

      const result = await service.remove(1);

      expect(result).toEqual(rs);
      expect(mockRepository.remove).toHaveBeenCalledWith(rs);
    });

    it('should throw NotFoundException when route stop does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
