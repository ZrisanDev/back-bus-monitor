import { Test, TestingModule } from '@nestjs/testing';
import { StopsController } from '../stops.controller';
import { CreateStopDto } from '../dto/create-stop.dto';
import { UpdateStopDto } from '../dto/update-stop.dto';
import { Stop } from '../entities/stop.entity';

describe('StopsController', () => {
  let controller: StopsController;
  let service: any;

  const makeStop = (overrides: Partial<Stop> = {}): Stop => ({
    id: 1,
    name: 'Parada Central',
    latitude: -34.603722,
    longitude: -58.381592,
    created_at: new Date('2025-01-01T00:00:00.000Z'),
    updated_at: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StopsController],
      providers: [
        {
          provide: 'IStopsService',
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

    controller = module.get<StopsController>(StopsController);
    service = module.get('IStopsService');
  });

  describe('create', () => {
    it('should call service.create with DTO and return result', async () => {
      const dto: CreateStopDto = {
        name: 'Parada Central',
        latitude: -34.603722,
        longitude: -58.381592,
      };
      const stop = makeStop();
      jest.spyOn(service, 'create').mockResolvedValue(stop);

      const result = await controller.create(dto);

      expect(result).toEqual(stop);
      expect(service.create).toHaveBeenCalledWith(dto);
    });

    it('should pass different DTO values to service', async () => {
      const dto: CreateStopDto = {
        name: 'Parada Sur',
        latitude: -34.7,
        longitude: -58.5,
      };
      const stop = makeStop({ name: 'Parada Sur', latitude: -34.7, longitude: -58.5 });
      jest.spyOn(service, 'create').mockResolvedValue(stop);

      const result = await controller.create(dto);

      expect(result.name).toBe('Parada Sur');
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all stops from service', async () => {
      const stops = [
        makeStop({ id: 1, name: 'Parada Central' }),
        makeStop({ id: 2, name: 'Parada Norte' }),
      ];
      jest.spyOn(service, 'findAll').mockResolvedValue(stops);

      const result = await controller.findAll();

      expect(result).toEqual(stops);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no stops exist', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return stop by id', async () => {
      const stop = makeStop({ id: 1 });
      jest.spyOn(service, 'findOne').mockResolvedValue(stop);

      const result = await controller.findOne('1');

      expect(result).toEqual(stop);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it('should return different stop by id', async () => {
      const stop = makeStop({ id: 42, name: 'Parada 42' });
      jest.spyOn(service, 'findOne').mockResolvedValue(stop);

      const result = await controller.findOne('42');

      expect(result.id).toBe(42);
      expect(service.findOne).toHaveBeenCalledWith(42);
    });
  });

  describe('update', () => {
    it('should call service.update and return result', async () => {
      const dto: UpdateStopDto = { name: 'Editada' };
      const updated = makeStop({ name: 'Editada' });
      jest.spyOn(service, 'update').mockResolvedValue(updated);

      const result = await controller.update('1', dto);

      expect(result).toEqual(updated);
      expect(service.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('remove', () => {
    it('should call service.remove and return result', async () => {
      const stop = makeStop();
      jest.spyOn(service, 'remove').mockResolvedValue(stop);

      const result = await controller.remove('1');

      expect(result).toEqual(stop);
      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});
