import { Test, TestingModule } from '@nestjs/testing';
import { HolidaysController } from '../holidays.controller';
import { CreateHolidayDto } from '../dto/create-holiday.dto';
import { UpdateHolidayDto } from '../dto/update-holiday.dto';
import { Holiday } from '../entities/holiday.entity';

describe('HolidaysController', () => {
  let controller: HolidaysController;
  let service: any;

  const makeHoliday = (overrides: Partial<Holiday> = {}): Holiday => ({
    id: 1,
    date: '2026-12-25',
    description: 'Navidad',
    created_at: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HolidaysController],
      providers: [
        {
          provide: 'IHolidaysService',
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

    controller = module.get<HolidaysController>(HolidaysController);
    service = module.get('IHolidaysService');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /holidays
  // ═══════════════════════════════════════════════════════════════════════════

  describe('create', () => {
    it('should call service.create with DTO and return result', async () => {
      const dto: CreateHolidayDto = {
        date: '2026-12-25',
        description: 'Navidad',
      };
      const holiday = makeHoliday();
      jest.spyOn(service, 'create').mockResolvedValue(holiday);

      const result = await controller.create(dto);

      expect(result).toEqual(holiday);
      expect(service.create).toHaveBeenCalledWith(dto);
    });

    it('should pass different DTO values to service', async () => {
      const dto: CreateHolidayDto = {
        date: '2026-07-09',
        description: 'Independencia',
      };
      const holiday = makeHoliday({ date: '2026-07-09', description: 'Independencia' });
      jest.spyOn(service, 'create').mockResolvedValue(holiday);

      const result = await controller.create(dto);

      expect(result.date).toBe('2026-07-09');
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /holidays
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return all holidays from service', async () => {
      const holidays = [
        makeHoliday({ id: 1 }),
        makeHoliday({ id: 2, date: '2026-07-09' }),
      ];
      jest.spyOn(service, 'findAll').mockResolvedValue(holidays);

      const result = await controller.findAll();

      expect(result).toEqual(holidays);
      expect(result).toHaveLength(2);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no holidays exist', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /holidays/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findOne', () => {
    it('should return holiday by id', async () => {
      const holiday = makeHoliday({ id: 1 });
      jest.spyOn(service, 'findOne').mockResolvedValue(holiday);

      const result = await controller.findOne('1');

      expect(result).toEqual(holiday);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it('should return different holiday by id', async () => {
      const holiday = makeHoliday({ id: 42, date: '2026-01-01' });
      jest.spyOn(service, 'findOne').mockResolvedValue(holiday);

      const result = await controller.findOne('42');

      expect(result.id).toBe(42);
      expect(service.findOne).toHaveBeenCalledWith(42);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /holidays/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('update', () => {
    it('should call service.update and return result', async () => {
      const dto: UpdateHolidayDto = { description: 'Editado' };
      const updated = makeHoliday({ description: 'Editado' });
      jest.spyOn(service, 'update').mockResolvedValue(updated);

      const result = await controller.update('1', dto);

      expect(result).toEqual(updated);
      expect(service.update).toHaveBeenCalledWith(1, dto);
    });

    it('should call service.update with different id and dto', async () => {
      const dto: UpdateHolidayDto = { date: '2026-01-01' };
      const updated = makeHoliday({ id: 5, date: '2026-01-01' });
      jest.spyOn(service, 'update').mockResolvedValue(updated);

      const result = await controller.update('5', dto);

      expect(service.update).toHaveBeenCalledWith(5, dto);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE /holidays/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('remove', () => {
    it('should call service.remove and return result', async () => {
      const holiday = makeHoliday();
      jest.spyOn(service, 'remove').mockResolvedValue(holiday);

      const result = await controller.remove('1');

      expect(result).toEqual(holiday);
      expect(service.remove).toHaveBeenCalledWith(1);
    });

    it('should call service.remove with different id', async () => {
      const holiday = makeHoliday({ id: 3 });
      jest.spyOn(service, 'remove').mockResolvedValue(holiday);

      await controller.remove('3');

      expect(service.remove).toHaveBeenCalledWith(3);
    });
  });
});
