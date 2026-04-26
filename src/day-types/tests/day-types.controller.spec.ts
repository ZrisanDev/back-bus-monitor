import { Test, TestingModule } from '@nestjs/testing';
import { DayTypesController } from '../day-types.controller';
import { CreateDayTypeDto } from '../dto/create-day-type.dto';
import { UpdateDayTypeDto } from '../dto/update-day-type.dto';
import { DayType } from '../entities/day-type.entity';

describe('DayTypesController', () => {
  let controller: DayTypesController;
  let service: any;

  const makeDayType = (overrides: Partial<DayType> = {}): DayType => ({
    id: 1,
    code: 'LUNES_VIERNES',
    label_es: 'Lunes a Viernes',
    label_en: 'Monday to Friday',
    created_at: new Date('2025-01-01T00:00:00.000Z'),
    updated_at: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DayTypesController],
      providers: [
        {
          provide: 'IDayTypesService',
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

    controller = module.get<DayTypesController>(DayTypesController);
    service = module.get('IDayTypesService');
  });

  describe('create', () => {
    it('should call service.create with DTO and return result', async () => {
      const dto: CreateDayTypeDto = {
        code: 'LUNES_VIERNES',
        label_es: 'Lunes a Viernes',
        label_en: 'Monday to Friday',
      };
      const dayType = makeDayType();
      jest.spyOn(service, 'create').mockResolvedValue(dayType);

      const result = await controller.create(dto);

      expect(result).toEqual(dayType);
      expect(service.create).toHaveBeenCalledWith(dto);
    });

    it('should pass different DTO values to service', async () => {
      const dto: CreateDayTypeDto = {
        code: 'FERIADO',
        label_es: 'Feriado',
        label_en: 'Holiday',
      };
      const dayType = makeDayType({
        code: 'FERIADO',
        label_es: 'Feriado',
        label_en: 'Holiday',
      });
      jest.spyOn(service, 'create').mockResolvedValue(dayType);

      const result = await controller.create(dto);

      expect(result.code).toBe('FERIADO');
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all day types from service', async () => {
      const dayTypes = [
        makeDayType({ id: 1, code: 'LUNES_VIERNES' }),
        makeDayType({ id: 2, code: 'SABADO' }),
      ];
      jest.spyOn(service, 'findAll').mockResolvedValue(dayTypes);

      const result = await controller.findAll();

      expect(result).toEqual(dayTypes);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no day types exist', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return day type by id', async () => {
      const dayType = makeDayType({ id: 1 });
      jest.spyOn(service, 'findOne').mockResolvedValue(dayType);

      const result = await controller.findOne('1');

      expect(result).toEqual(dayType);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it('should return different day type by id', async () => {
      const dayType = makeDayType({ id: 3, code: 'DOMINGO' });
      jest.spyOn(service, 'findOne').mockResolvedValue(dayType);

      const result = await controller.findOne('3');

      expect(result.id).toBe(3);
      expect(service.findOne).toHaveBeenCalledWith(3);
    });
  });

  describe('update', () => {
    it('should call service.update and return result', async () => {
      const dto: UpdateDayTypeDto = { label_es: 'Editado' };
      const updated = makeDayType({ label_es: 'Editado' });
      jest.spyOn(service, 'update').mockResolvedValue(updated);

      const result = await controller.update('1', dto);

      expect(result).toEqual(updated);
      expect(service.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('remove', () => {
    it('should call service.remove and return result', async () => {
      const dayType = makeDayType();
      jest.spyOn(service, 'remove').mockResolvedValue(dayType);

      const result = await controller.remove('1');

      expect(result).toEqual(dayType);
      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});
