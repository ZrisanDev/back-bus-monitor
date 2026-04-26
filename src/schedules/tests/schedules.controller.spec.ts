import { Test, TestingModule } from '@nestjs/testing';
import { SchedulesController } from '../schedules.controller';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { UpdateScheduleDto } from '../dto/update-schedule.dto';
import { Schedule } from '../entities/schedule.entity';

describe('SchedulesController', () => {
  let controller: SchedulesController;
  let service: any;

  const makeSchedule = (overrides: Partial<Schedule> = {}): Schedule => ({
    id: 1,
    route_id: 10,
    direction_id: 2,
    day_type_id: 3,
    start_time: '06:00',
    end_time: '22:00',
    is_operating: true,
    created_at: new Date('2025-01-01T00:00:00.000Z'),
    updated_at: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchedulesController],
      providers: [
        {
          provide: 'ISchedulesService',
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            lookup: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SchedulesController>(SchedulesController);
    service = module.get('ISchedulesService');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /schedules
  // ═══════════════════════════════════════════════════════════════════════════

  describe('create', () => {
    it('should call service.create with DTO and return result', async () => {
      const dto: CreateScheduleDto = {
        route_id: 10,
        direction_id: 2,
        day_type_id: 3,
        start_time: '06:00',
        end_time: '22:00',
        is_operating: true,
      };
      const schedule = makeSchedule();
      jest.spyOn(service, 'create').mockResolvedValue(schedule);

      const result = await controller.create(dto);

      expect(result).toEqual(schedule);
      expect(service.create).toHaveBeenCalledWith(dto);
    });

    it('should pass different DTO values to service', async () => {
      const dto: CreateScheduleDto = {
        route_id: 5,
        direction_id: 1,
        day_type_id: 4,
        start_time: '08:00',
        end_time: '18:00',
        is_operating: true,
      };
      const schedule = makeSchedule({
        route_id: 5,
        direction_id: 1,
        day_type_id: 4,
        start_time: '08:00',
        end_time: '18:00',
      });
      jest.spyOn(service, 'create').mockResolvedValue(schedule);

      const result = await controller.create(dto);

      expect(result.route_id).toBe(5);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /schedules
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return all schedules from service', async () => {
      const schedules = [
        makeSchedule({ id: 1 }),
        makeSchedule({ id: 2, day_type_id: 4 }),
      ];
      jest.spyOn(service, 'findAll').mockResolvedValue(schedules);

      const result = await controller.findAll();

      expect(result).toEqual(schedules);
      expect(result).toHaveLength(2);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no schedules exist', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /schedules/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findOne', () => {
    it('should return schedule by id', async () => {
      const schedule = makeSchedule({ id: 1 });
      jest.spyOn(service, 'findOne').mockResolvedValue(schedule);

      const result = await controller.findOne('1');

      expect(result).toEqual(schedule);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it('should return different schedule by id', async () => {
      const schedule = makeSchedule({ id: 42, start_time: '09:00' });
      jest.spyOn(service, 'findOne').mockResolvedValue(schedule);

      const result = await controller.findOne('42');

      expect(result.id).toBe(42);
      expect(service.findOne).toHaveBeenCalledWith(42);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /schedules/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('update', () => {
    it('should call service.update and return result', async () => {
      const dto: UpdateScheduleDto = { start_time: '07:00' };
      const updated = makeSchedule({ start_time: '07:00' });
      jest.spyOn(service, 'update').mockResolvedValue(updated);

      const result = await controller.update('1', dto);

      expect(result).toEqual(updated);
      expect(service.update).toHaveBeenCalledWith(1, dto);
    });

    it('should call service.update with different id and dto', async () => {
      const dto: UpdateScheduleDto = { is_operating: false };
      const updated = makeSchedule({ id: 5, is_operating: false });
      jest.spyOn(service, 'update').mockResolvedValue(updated);

      const result = await controller.update('5', dto);

      expect(service.update).toHaveBeenCalledWith(5, dto);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE /schedules/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('remove', () => {
    it('should call service.remove and return result', async () => {
      const schedule = makeSchedule();
      jest.spyOn(service, 'remove').mockResolvedValue(schedule);

      const result = await controller.remove('1');

      expect(result).toEqual(schedule);
      expect(service.remove).toHaveBeenCalledWith(1);
    });

    it('should call service.remove with different id', async () => {
      const schedule = makeSchedule({ id: 3 });
      jest.spyOn(service, 'remove').mockResolvedValue(schedule);

      await controller.remove('3');

      expect(service.remove).toHaveBeenCalledWith(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK-014: GET /schedules/lookup
  // ═══════════════════════════════════════════════════════════════════════════

  describe('lookup', () => {
    // ── SCN: Delegates to service.lookup with query params ────────────────

    it('should call service.lookup with route_id, direction_id, and date', async () => {
      const lookupResult = {
        date: '2026-04-25',
        is_holiday: false,
        day_type: 'SABADO',
        schedule: {
          start_time: '05:15:00',
          end_time: '20:20:00',
          is_operating: true,
        },
      };
      jest.spyOn(service, 'lookup').mockResolvedValue(lookupResult);

      const result = await controller.lookup('5', '2', '2026-04-25');

      expect(result).toEqual(lookupResult);
      expect(service.lookup).toHaveBeenCalledWith(5, 2, '2026-04-25');
    });

    // ── SCN: Triangulation — holiday lookup ──────────────────────────────

    it('should pass different route_id, direction_id, and date values', async () => {
      const lookupResult = {
        date: '2026-12-25',
        is_holiday: true,
        day_type: 'FERIADO',
        schedule: null,
      };
      jest.spyOn(service, 'lookup').mockResolvedValue(lookupResult);

      const result = await controller.lookup('10', '1', '2026-12-25');

      expect(service.lookup).toHaveBeenCalledWith(10, 1, '2026-12-25');
      expect(result.is_holiday).toBe(true);
      expect(result.schedule).toBeNull();
    });
  });
});
