import { Test, TestingModule } from '@nestjs/testing';
import { RouteStopsController } from '../route-stops.controller';
import { CreateRouteStopDto } from '../dto/create-route-stop.dto';
import { UpdateRouteStopDto } from '../dto/update-route-stop.dto';
import { RouteStop } from '../entities/route-stop.entity';
import { Route } from '../../routes/entities/route.entity';
import { Stop } from '../../stops/entities/stop.entity';

describe('RouteStopsController', () => {
  let controller: RouteStopsController;
  let service: any;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RouteStopsController],
      providers: [
        {
          provide: 'IRouteStopsService',
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RouteStopsController>(RouteStopsController);
    service = module.get('IRouteStopsService');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /route-stops
  // ═══════════════════════════════════════════════════════════════════════════

  describe('create', () => {
    it('should call service.create with DTO and return result', async () => {
      const dto: CreateRouteStopDto = {
        route_id: 10,
        stop_id: 20,
        stop_order: 1,
      };
      const rs = makeRouteStop();
      jest.spyOn(service, 'create').mockResolvedValue(rs);

      const result = await controller.create(dto);

      expect(result).toEqual(rs);
      expect(service.create).toHaveBeenCalledWith(dto);
    });

    it('should pass different DTO values to service', async () => {
      const dto: CreateRouteStopDto = {
        route_id: 5,
        stop_id: 15,
        stop_order: 3,
      };
      const rs = makeRouteStop({ route_id: 5, stop_id: 15, stop_order: 3 });
      jest.spyOn(service, 'create').mockResolvedValue(rs);

      const result = await controller.create(dto);

      expect(result.route_id).toBe(5);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /route-stops
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return all route stops from service', async () => {
      const stops = [
        makeRouteStop({ id: 1, stop_order: 1 }),
        makeRouteStop({ id: 2, stop_order: 2 }),
      ];
      jest.spyOn(service, 'findAll').mockResolvedValue(stops);

      const result = await controller.findAll();

      expect(result).toEqual(stops);
      expect(result).toHaveLength(2);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no route stops exist', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /route-stops/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findOne', () => {
    it('should return route stop by id', async () => {
      const rs = makeRouteStop({ id: 1 });
      jest.spyOn(service, 'findOne').mockResolvedValue(rs);

      const result = await controller.findOne('1');

      expect(result).toEqual(rs);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it('should return different route stop by id', async () => {
      const rs = makeRouteStop({ id: 42, stop_order: 5 });
      jest.spyOn(service, 'findOne').mockResolvedValue(rs);

      const result = await controller.findOne('42');

      expect(result.id).toBe(42);
      expect(service.findOne).toHaveBeenCalledWith(42);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /route-stops/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('update', () => {
    it('should call service.update and return result', async () => {
      const dto: UpdateRouteStopDto = { stop_order: 3 };
      const updated = makeRouteStop({ stop_order: 3 });
      jest.spyOn(service, 'update').mockResolvedValue(updated);

      const result = await controller.update('1', dto);

      expect(result).toEqual(updated);
      expect(service.update).toHaveBeenCalledWith(1, dto);
    });

    it('should call service.update with different id and dto', async () => {
      const dto: UpdateRouteStopDto = { stop_order: 7 };
      const updated = makeRouteStop({ id: 5, stop_order: 7 });
      jest.spyOn(service, 'update').mockResolvedValue(updated);

      const result = await controller.update('5', dto);

      expect(service.update).toHaveBeenCalledWith(5, dto);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE /route-stops/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('remove', () => {
    it('should call service.remove and return result', async () => {
      const rs = makeRouteStop();
      jest.spyOn(service, 'remove').mockResolvedValue(rs);

      const result = await controller.remove('1');

      expect(result).toEqual(rs);
      expect(service.remove).toHaveBeenCalledWith(1);
    });

    it('should call service.remove with different id', async () => {
      const rs = makeRouteStop({ id: 3 });
      jest.spyOn(service, 'remove').mockResolvedValue(rs);

      await controller.remove('3');

      expect(service.remove).toHaveBeenCalledWith(3);
    });
  });
});
