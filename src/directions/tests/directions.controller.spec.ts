import { Test, TestingModule } from '@nestjs/testing';
import { DirectionsController } from '../directions.controller';
import { CreateDirectionDto } from '../dto/create-direction.dto';
import { UpdateDirectionDto } from '../dto/update-direction.dto';
import { Direction } from '../entities/direction.entity';

describe('DirectionsController', () => {
  let controller: DirectionsController;
  let service: any;

  const makeDirection = (overrides: Partial<Direction> = {}): Direction => ({
    id: 1,
    code: 'NORTE_SUR',
    label_es: 'Norte → Sur',
    label_en: 'North → South',
    created_at: new Date('2025-01-01T00:00:00.000Z'),
    updated_at: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DirectionsController],
      providers: [
        {
          provide: 'IDirectionsService',
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

    controller = module.get<DirectionsController>(DirectionsController);
    service = module.get('IDirectionsService');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /directions
  // ═══════════════════════════════════════════════════════════════════════════

  describe('create', () => {
    it('should call service.create with DTO and return result', async () => {
      const dto: CreateDirectionDto = {
        code: 'NORTE_SUR',
        label_es: 'Norte → Sur',
        label_en: 'North → South',
      };
      const direction = makeDirection();
      jest.spyOn(service, 'create').mockResolvedValue(direction);

      const result = await controller.create(dto);

      expect(result).toEqual(direction);
      expect(service.create).toHaveBeenCalledWith(dto);
    });

    it('should pass different DTO values to service', async () => {
      const dto: CreateDirectionDto = {
        code: 'ESTE_OESTE',
        label_es: 'Este → Oeste',
        label_en: 'East → West',
      };
      const direction = makeDirection({
        code: 'ESTE_OESTE',
        label_es: 'Este → Oeste',
        label_en: 'East → West',
      });
      jest.spyOn(service, 'create').mockResolvedValue(direction);

      const result = await controller.create(dto);

      expect(result.code).toBe('ESTE_OESTE');
      expect(result.label_es).toBe('Este → Oeste');
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /directions
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return all directions from service', async () => {
      const directions = [
        makeDirection({ id: 1, code: 'NORTE_SUR' }),
        makeDirection({ id: 2, code: 'SUR_NORTE' }),
      ];
      jest.spyOn(service, 'findAll').mockResolvedValue(directions);

      const result = await controller.findAll();

      expect(result).toEqual(directions);
      expect(result).toHaveLength(2);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no directions exist', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /directions/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findOne', () => {
    it('should return direction by id', async () => {
      const direction = makeDirection({ id: 1 });
      jest.spyOn(service, 'findOne').mockResolvedValue(direction);

      const result = await controller.findOne('1');

      expect(result).toEqual(direction);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it('should return different direction by id', async () => {
      const direction = makeDirection({ id: 42, code: 'ESTE_OESTE' });
      jest.spyOn(service, 'findOne').mockResolvedValue(direction);

      const result = await controller.findOne('42');

      expect(result.id).toBe(42);
      expect(service.findOne).toHaveBeenCalledWith(42);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /directions/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('update', () => {
    it('should call service.update and return result', async () => {
      const dto: UpdateDirectionDto = { label_es: 'Editado' };
      const updated = makeDirection({ label_es: 'Editado' });
      jest.spyOn(service, 'update').mockResolvedValue(updated);

      const result = await controller.update('1', dto);

      expect(result).toEqual(updated);
      expect(service.update).toHaveBeenCalledWith(1, dto);
    });

    it('should call service.update with different id and dto', async () => {
      const dto: UpdateDirectionDto = { label_en: 'Edited' };
      const updated = makeDirection({ id: 5, label_en: 'Edited' });
      jest.spyOn(service, 'update').mockResolvedValue(updated);

      const result = await controller.update('5', dto);

      expect(service.update).toHaveBeenCalledWith(5, dto);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE /directions/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('remove', () => {
    it('should call service.remove and return result', async () => {
      const direction = makeDirection();
      jest.spyOn(service, 'remove').mockResolvedValue(direction);

      const result = await controller.remove('1');

      expect(result).toEqual(direction);
      expect(service.remove).toHaveBeenCalledWith(1);
    });

    it('should call service.remove with different id', async () => {
      const direction = makeDirection({ id: 3 });
      jest.spyOn(service, 'remove').mockResolvedValue(direction);

      await controller.remove('3');

      expect(service.remove).toHaveBeenCalledWith(3);
    });
  });
});
