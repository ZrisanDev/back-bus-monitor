import { Test, TestingModule } from '@nestjs/testing';
import { RoutesController } from '../routes.controller';
import { CreateRouteDto } from '../dto/create-route.dto';
import { UpdateRouteDto } from '../dto/update-route.dto';
import { Route } from '../entities/route.entity';

describe('RoutesController', () => {
  let controller: RoutesController;
  let service: any;

  const makeRoute = (overrides: Partial<Route> = {}): Route => ({
    id: 1,
    name: 'Línea 1',
    description: 'Main route',
    created_at: new Date('2025-01-01T00:00:00.000Z'),
    updated_at: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoutesController],
      providers: [
        {
          provide: 'IRoutesService',
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findStopsByRoute: jest.fn(),
            findGeoJsonByRoute: jest.fn(),
            findSegmentByOrder: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RoutesController>(RoutesController);
    service = module.get('IRoutesService');
  });

  describe('create', () => {
    it('should call service.create with DTO and return result', async () => {
      const dto: CreateRouteDto = { name: 'Línea 1' };
      const route = makeRoute();
      jest.spyOn(service, 'create').mockResolvedValue(route);

      const result = await controller.create(dto);

      expect(result).toEqual(route);
      expect(service.create).toHaveBeenCalledWith(dto);
    });

    it('should pass different DTO values to service', async () => {
      const dto: CreateRouteDto = { name: 'Línea 99', description: 'Different' };
      const route = makeRoute({ name: 'Línea 99', description: 'Different' });
      jest.spyOn(service, 'create').mockResolvedValue(route);

      const result = await controller.create(dto);

      expect(result.name).toBe('Línea 99');
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all routes from service', async () => {
      const routes = [
        makeRoute({ id: 1, name: 'Línea 1' }),
        makeRoute({ id: 2, name: 'Línea 2' }),
      ];
      jest.spyOn(service, 'findAll').mockResolvedValue(routes);

      const result = await controller.findAll();

      expect(result).toEqual(routes);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no routes exist', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return route by id', async () => {
      const route = makeRoute({ id: 1 });
      jest.spyOn(service, 'findOne').mockResolvedValue(route);

      const result = await controller.findOne('1');

      expect(result).toEqual(route);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it('should return different route by id', async () => {
      const route = makeRoute({ id: 42, name: 'Línea 42' });
      jest.spyOn(service, 'findOne').mockResolvedValue(route);

      const result = await controller.findOne('42');

      expect(result.id).toBe(42);
      expect(service.findOne).toHaveBeenCalledWith(42);
    });
  });

  describe('update', () => {
    it('should call service.update and return result', async () => {
      const dto: UpdateRouteDto = { description: 'Updated' };
      const updated = makeRoute({ description: 'Updated' });
      jest.spyOn(service, 'update').mockResolvedValue(updated);

      const result = await controller.update('1', dto);

      expect(result).toEqual(updated);
      expect(service.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('remove', () => {
    it('should call service.remove and return result', async () => {
      const route = makeRoute();
      jest.spyOn(service, 'remove').mockResolvedValue(route);

      const result = await controller.remove('1');

      expect(result).toEqual(route);
      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TASK 2.3: GET /routes/:id/stops
  // ═══════════════════════════════════════════════════════════════════════

  describe('findStopsByRoute', () => {
    // ── SCN: Delegates to service with parsed id ──────────────────────────

    it('should call service.findStopsByRoute with parsed id', async () => {
      const stops = [
        { id: 1, name: 'Stop A', latitude: -12.0, longitude: -77.0 },
        { id: 2, name: 'Stop B', latitude: -12.1, longitude: -77.1 },
      ];
      jest.spyOn(service, 'findStopsByRoute').mockResolvedValue(stops);

      const result = await controller.findStopsByRoute('1');

      expect(result).toEqual(stops);
      expect(service.findStopsByRoute).toHaveBeenCalledWith(1);
    });

    // ── SCN: Triangulation — different route id ───────────────────────────

    it('should parse different route id correctly', async () => {
      jest.spyOn(service, 'findStopsByRoute').mockResolvedValue([]);

      await controller.findStopsByRoute('42');

      expect(service.findStopsByRoute).toHaveBeenCalledWith(42);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TASK 2.3: GET /routes/:id/geojson
  // ═══════════════════════════════════════════════════════════════════════

  describe('findGeoJsonByRoute', () => {
    // ── SCN: Delegates to service with parsed id ──────────────────────────

    it('should call service.findGeoJsonByRoute with parsed id', async () => {
      const geojson = { type: 'FeatureCollection', features: [] };
      jest.spyOn(service, 'findGeoJsonByRoute').mockResolvedValue(geojson);

      const result = await controller.findGeoJsonByRoute('1');

      expect(result).toEqual(geojson);
      expect(service.findGeoJsonByRoute).toHaveBeenCalledWith(1);
    });

    // ── SCN: Triangulation — different route id ───────────────────────────

    it('should parse different route id correctly', async () => {
      const geojson = { type: 'FeatureCollection', features: [] };
      jest.spyOn(service, 'findGeoJsonByRoute').mockResolvedValue(geojson);

      await controller.findGeoJsonByRoute('5');

      expect(service.findGeoJsonByRoute).toHaveBeenCalledWith(5);
    });

    // ── SCN: 404 for non-existent route (REQ-RG-005)

    it('should propagate NotFoundException for non-existent route', async () => {
      const { NotFoundException } = await import('@nestjs/common');
      jest.spyOn(service, 'findGeoJsonByRoute').mockRejectedValue(
        new NotFoundException('Ruta con ID 9999 no encontrada'),
      );

      await expect(controller.findGeoJsonByRoute('9999')).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // REQ-RG-003/004/006: GET /routes/:id/segment/:order
  // ═══════════════════════════════════════════════════════════════════════

  describe('findSegmentByOrder', () => {
    // ── SCN: Returns 200 with Feature for valid order (REQ-RG-003)

    it('should call service.findSegmentByOrder with parsed params and return result', async () => {
      const feature = {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[-77.0, -12.0], [-77.1, -12.1]] },
        properties: { route_id: 1, route_name: 'Test', stop_id: 10, stop_name: 'Stop A', order: 1 },
      };
      jest.spyOn(service, 'findSegmentByOrder').mockResolvedValue(feature);

      const result = await controller.findSegmentByOrder('1', '1');

      expect(result).toEqual(feature);
      expect(service.findSegmentByOrder).toHaveBeenCalledWith(1, 1);
    });

    // ── SCN: 404 for last stop null geometry (REQ-RG-004)

    it('should propagate NotFoundException from service for null geometry', async () => {
      const { NotFoundException } = await import('@nestjs/common');
      jest.spyOn(service, 'findSegmentByOrder').mockRejectedValue(
        new NotFoundException('Segment geometry no disponible'),
      );

      await expect(controller.findSegmentByOrder('1', '2')).rejects.toThrow(NotFoundException);
    });

    // ── SCN: 404 for invalid order (REQ-RG-006)

    it('should propagate NotFoundException from service for invalid order', async () => {
      const { NotFoundException } = await import('@nestjs/common');
      jest.spyOn(service, 'findSegmentByOrder').mockRejectedValue(
        new NotFoundException('Stop order 99 no encontrado'),
      );

      await expect(controller.findSegmentByOrder('1', '99')).rejects.toThrow(NotFoundException);
    });

    // ── SCN: Triangulation — different route and order

    it('should parse different route and order params correctly', async () => {
      const feature = { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} };
      jest.spyOn(service, 'findSegmentByOrder').mockResolvedValue(feature);

      await controller.findSegmentByOrder('5', '3');

      expect(service.findSegmentByOrder).toHaveBeenCalledWith(5, 3);
    });
  });
});
