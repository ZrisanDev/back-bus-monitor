import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RoutesService } from '../routes.service';
import { Route } from '../entities/route.entity';
import { RouteStop } from '../../route-stops/entities/route-stop.entity';
import { Stop } from '../../stops/entities/stop.entity';
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
  let mockRouteStopRepository: {
    find: jest.Mock;
  };

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    mockRouteStopRepository = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutesService,
        {
          provide: getRepositoryToken(Route),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(RouteStop),
          useValue: mockRouteStopRepository,
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

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK 2.3: findStopsByRoute — ordered stops for a route
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findStopsByRoute', () => {
    // ── SCN: Returns stops ordered by stop_order ───────────────────────────

    it('should return stops ordered by stop_order for a route', async () => {
      const route = makeRoute({ id: 1 });
      mockRepository.findOneBy.mockResolvedValue(route);
      mockRouteStopRepository.find.mockResolvedValue([
        { id: 1, route_id: 1, stop_id: 10, direction_id: 1, stop_order: 1, stop: { id: 10, name: 'Stop A', latitude: -12.0, longitude: -77.0 } },
        { id: 2, route_id: 1, stop_id: 20, direction_id: 1, stop_order: 2, stop: { id: 20, name: 'Stop B', latitude: -12.1, longitude: -77.1 } },
      ]);

      const result = await service.findStopsByRoute(1);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Stop A');
      expect(result[1].name).toBe('Stop B');
    });

    // ── SCN: 404 for non-existent route ────────────────────────────────────

    it('should throw NotFoundException for non-existent route', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findStopsByRoute(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    // ── SCN: Empty stops for valid route ───────────────────────────────────

    it('should return empty array for route with no stops', async () => {
      const route = makeRoute({ id: 1 });
      mockRepository.findOneBy.mockResolvedValue(route);
      mockRouteStopRepository.find.mockResolvedValue([]);

      const result = await service.findStopsByRoute(1);

      expect(result).toEqual([]);
    });

    // ── SCN: Triangulation — different route returns different stops ───────

    it('should query stops for the correct route_id', async () => {
      const route = makeRoute({ id: 5 });
      mockRepository.findOneBy.mockResolvedValue(route);
      mockRouteStopRepository.find.mockResolvedValue([]);

      await service.findStopsByRoute(5);

      expect(mockRouteStopRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { route_id: 5 },
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK 2.3: findGeoJsonByRoute — GeoJSON LineString + Points
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findGeoJsonByRoute', () => {
    // ── SCN: Returns valid GeoJSON with LineString and Points ──────────────

    it('should return GeoJSON FeatureCollection with LineString and Point features', async () => {
      const route = makeRoute({ id: 1, name: 'Expreso 1' });
      mockRepository.findOneBy.mockResolvedValue(route);
      mockRouteStopRepository.find.mockResolvedValue([
        { id: 1, route_id: 1, stop_id: 10, direction_id: 1, stop_order: 1, stop: { id: 10, name: 'Stop A', latitude: -12.0, longitude: -77.0 } },
        { id: 2, route_id: 1, stop_id: 20, direction_id: 1, stop_order: 2, stop: { id: 20, name: 'Stop B', latitude: -12.1, longitude: -77.1 } },
      ]);

      const result = await service.findGeoJsonByRoute(1);

      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(3); // 1 LineString + 2 Points

      // LineString feature
      const lineStringFeature = result.features.find((f: any) => f.geometry.type === 'LineString');
      expect(lineStringFeature).toBeDefined();
      expect(lineStringFeature.geometry.coordinates).toEqual([
        [-77.0, -12.0],
        [-77.1, -12.1],
      ]);
      expect(lineStringFeature.properties.route_name).toBe('Expreso 1');

      // Point features
      const pointFeatures = result.features.filter((f: any) => f.geometry.type === 'Point');
      expect(pointFeatures).toHaveLength(2);
      expect(pointFeatures[0].geometry.coordinates).toEqual([-77.0, -12.0]);
      expect(pointFeatures[0].properties.name).toBe('Stop A');
      expect(pointFeatures[1].geometry.coordinates).toEqual([-77.1, -12.1]);
      expect(pointFeatures[1].properties.name).toBe('Stop B');
    });

    // ── SCN: Coordinates are [longitude, latitude] ─────────────────────────

    it('should use [longitude, latitude] coordinate order in GeoJSON', async () => {
      const route = makeRoute({ id: 1, name: 'Ruta 1' });
      mockRepository.findOneBy.mockResolvedValue(route);
      mockRouteStopRepository.find.mockResolvedValue([
        { id: 1, route_id: 1, stop_id: 10, direction_id: 1, stop_order: 1, stop: { id: 10, name: 'Terminal', latitude: -12.05, longitude: -77.03 } },
      ]);

      const result = await service.findGeoJsonByRoute(1);

      const point = result.features.find((f: any) => f.geometry.type === 'Point');
      expect(point.geometry.coordinates[0]).toBe(-77.03); // longitude first
      expect(point.geometry.coordinates[1]).toBe(-12.05); // latitude second
    });

    // ── SCN: 404 for non-existent route ────────────────────────────────────

    it('should throw NotFoundException for non-existent route', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findGeoJsonByRoute(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    // ── SCN: Empty route returns FeatureCollection with no features ────────

    it('should return empty FeatureCollection for route with no stops', async () => {
      const route = makeRoute({ id: 1, name: 'Empty Route' });
      mockRepository.findOneBy.mockResolvedValue(route);
      mockRouteStopRepository.find.mockResolvedValue([]);

      const result = await service.findGeoJsonByRoute(1);

      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toEqual([]);
    });

    // ── SCN: Triangulation — different route data ──────────────────────────

    it('should return correct GeoJSON for different route', async () => {
      const route = makeRoute({ id: 2, name: 'Expreso 2' });
      mockRepository.findOneBy.mockResolvedValue(route);
      mockRouteStopRepository.find.mockResolvedValue([
        { id: 3, route_id: 2, stop_id: 30, direction_id: 2, stop_order: 1, stop: { id: 30, name: 'Javier Prado', latitude: -12.09, longitude: -76.97 } },
      ]);

      const result = await service.findGeoJsonByRoute(2);

      expect(result.features).toHaveLength(2); // 1 LineString + 1 Point
      const lineFeature = result.features.find((f: any) => f.geometry.type === 'LineString');
      expect(lineFeature.properties.route_name).toBe('Expreso 2');
      const pointFeature = result.features.find((f: any) => f.geometry.type === 'Point');
      expect(pointFeature.properties.name).toBe('Javier Prado');
    });
  });
});
