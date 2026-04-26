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
});
