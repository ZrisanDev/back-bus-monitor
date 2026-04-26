import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { SchedulesService } from '../schedules.service';
import { Schedule } from '../entities/schedule.entity';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { UpdateScheduleDto } from '../dto/update-schedule.dto';
import { ScheduleLookupService } from '../services/schedule-lookup.service';

describe('SchedulesService', () => {
  let service: SchedulesService;
  let mockRepository: {
    find: jest.Mock;
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    merge: jest.Mock;
  };
  let mockScheduleLookupService: {
    lookup: jest.Mock;
  };

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      merge: jest.fn(),
    };

    mockScheduleLookupService = {
      lookup: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulesService,
        {
          provide: getRepositoryToken(Schedule),
          useValue: mockRepository,
        },
        {
          provide: ScheduleLookupService,
          useValue: mockScheduleLookupService,
        },
      ],
    }).compile();

    service = module.get<SchedulesService>(SchedulesService);
  });

  // ── Helper ───────────────────────────────────────────────────────────────

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

  // ═══════════════════════════════════════════════════════════════════════════
  // findAll
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return all schedules', async () => {
      const schedules = [
        makeSchedule({ id: 1 }),
        makeSchedule({ id: 2, day_type_id: 4 }),
      ];
      mockRepository.find.mockResolvedValue(schedules);

      const result = await service.findAll();

      expect(result).toEqual(schedules);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no schedules exist', async () => {
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
    it('should return schedule when id exists', async () => {
      const schedule = makeSchedule({ id: 1 });
      mockRepository.findOneBy.mockResolvedValue(schedule);

      const result = await service.findOne(1);

      expect(result).toEqual(schedule);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('should return correct schedule for different id', async () => {
      const schedule = makeSchedule({ id: 42, start_time: '08:00', end_time: '18:00' });
      mockRepository.findOneBy.mockResolvedValue(schedule);

      const result = await service.findOne(42);

      expect(result.id).toBe(42);
      expect(result.start_time).toBe('08:00');
    });

    it('should throw NotFoundException when schedule does not exist', async () => {
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
    const dto: CreateScheduleDto = {
      route_id: 10,
      direction_id: 2,
      day_type_id: 3,
      start_time: '06:00',
      end_time: '22:00',
      is_operating: true,
    };

    it('should create and return a new schedule', async () => {
      const schedule = makeSchedule();
      mockRepository.findOneBy.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(schedule);
      mockRepository.save.mockResolvedValue(schedule);

      const result = await service.create(dto);

      expect(result).toEqual(schedule);
      expect(mockRepository.create).toHaveBeenCalledWith(dto);
      expect(mockRepository.save).toHaveBeenCalledWith(schedule);
    });

    it('should create a schedule with different data', async () => {
      const otherDto: CreateScheduleDto = {
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
      mockRepository.findOneBy.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(schedule);
      mockRepository.save.mockResolvedValue(schedule);

      const result = await service.create(otherDto);

      expect(result.route_id).toBe(5);
      expect(result.start_time).toBe('08:00');
    });

    it('should create a non-operating schedule with null times', async () => {
      const dto: CreateScheduleDto = {
        route_id: 10,
        direction_id: 2,
        day_type_id: 3,
        is_operating: false,
      };
      const schedule = makeSchedule({
        is_operating: false,
        start_time: null as any,
        end_time: null as any,
      });
      mockRepository.findOneBy.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(schedule);
      mockRepository.save.mockResolvedValue(schedule);

      const result = await service.create(dto);

      expect(result.is_operating).toBe(false);
    });

    it('should throw ConflictException when (route_id, direction_id, day_type_id) already exists', async () => {
      const existing = makeSchedule();
      mockRepository.findOneBy.mockResolvedValue(existing);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException with 409 status for duplicate combination', async () => {
      const existing = makeSchedule();
      mockRepository.findOneBy.mockResolvedValue(existing);

      try {
        await service.create(dto);
        fail('Expected ConflictException');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        expect((error as ConflictException).getStatus()).toBe(409);
      }
    });

    it('should not call save when combination already exists', async () => {
      const existing = makeSchedule();
      mockRepository.findOneBy.mockResolvedValue(existing);

      await expect(service.create(dto)).rejects.toThrow();
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw UnprocessableEntityException when start_time >= end_time on operating schedule', async () => {
      const badDto: CreateScheduleDto = {
        route_id: 10,
        direction_id: 2,
        day_type_id: 3,
        start_time: '22:00',
        end_time: '06:00',
        is_operating: true,
      };
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.create(badDto)).rejects.toThrow(UnprocessableEntityException);
    });

    it('should throw UnprocessableEntityException when start_time equals end_time', async () => {
      const badDto: CreateScheduleDto = {
        route_id: 10,
        direction_id: 2,
        day_type_id: 3,
        start_time: '12:00',
        end_time: '12:00',
        is_operating: true,
      };
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.create(badDto)).rejects.toThrow(UnprocessableEntityException);
    });

    it('should throw UnprocessableEntityException when operating schedule is missing start_time', async () => {
      const badDto: CreateScheduleDto = {
        route_id: 10,
        direction_id: 2,
        day_type_id: 3,
        end_time: '22:00',
        is_operating: true,
      } as any;
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.create(badDto)).rejects.toThrow(UnprocessableEntityException);
    });

    it('should throw UnprocessableEntityException when operating schedule is missing end_time', async () => {
      const badDto: CreateScheduleDto = {
        route_id: 10,
        direction_id: 2,
        day_type_id: 3,
        start_time: '06:00',
        is_operating: true,
      } as any;
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.create(badDto)).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // update
  // ═══════════════════════════════════════════════════════════════════════════

  describe('update', () => {
    it('should update and return the schedule', async () => {
      const existing = makeSchedule();
      const updated = { ...existing, start_time: '07:00' };
      mockRepository.findOneBy.mockResolvedValue(existing);
      mockRepository.save.mockResolvedValue(updated);

      const result = await service.update(1, { start_time: '07:00' });

      expect(result.start_time).toBe('07:00');
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when schedule does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.update(999, { start_time: '07:00' })).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when updating to existing (route, direction, day_type) combo', async () => {
      const existing = makeSchedule({ id: 1, route_id: 10, direction_id: 2, day_type_id: 3 });
      const other = makeSchedule({ id: 2, route_id: 20, direction_id: 5, day_type_id: 7 });
      mockRepository.findOneBy
        .mockResolvedValueOnce(existing)  // findOne for id
        .mockResolvedValueOnce(other);     // findOneBy for new combo

      const updateDto: UpdateScheduleDto = { route_id: 20, direction_id: 5, day_type_id: 7 };

      await expect(service.update(1, updateDto)).rejects.toThrow(ConflictException);
    });

    it('should throw UnprocessableEntityException when updating to invalid time window', async () => {
      const existing = makeSchedule();
      mockRepository.findOneBy.mockResolvedValue(existing);

      const updateDto: UpdateScheduleDto = { start_time: '23:00', end_time: '06:00' };

      await expect(service.update(1, updateDto)).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // remove
  // ═══════════════════════════════════════════════════════════════════════════

  describe('remove', () => {
    it('should remove and return the schedule', async () => {
      const schedule = makeSchedule();
      mockRepository.findOneBy.mockResolvedValue(schedule);
      mockRepository.remove.mockResolvedValue(schedule);

      const result = await service.remove(1);

      expect(result).toEqual(schedule);
      expect(mockRepository.remove).toHaveBeenCalledWith(schedule);
    });

    it('should throw NotFoundException when schedule does not exist', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK-014: lookup — delegates to ScheduleLookupService
  // ═══════════════════════════════════════════════════════════════════════════

  describe('lookup', () => {
    // ── SCN: Delegates to ScheduleLookupService ───────────────────────────

    it('should delegate to scheduleLookupService.lookup()', async () => {
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
      mockScheduleLookupService.lookup.mockResolvedValue(lookupResult);

      const result = await service.lookup(5, 2, '2026-04-25');

      expect(result).toEqual(lookupResult);
      expect(mockScheduleLookupService.lookup).toHaveBeenCalledWith(5, 2, '2026-04-25');
      expect(mockScheduleLookupService.lookup).toHaveBeenCalledTimes(1);
    });

    // ── SCN: Triangulation — holiday with null schedule ──────────────────

    it('should return holiday result with null schedule', async () => {
      const lookupResult = {
        date: '2026-12-25',
        is_holiday: true,
        day_type: 'FERIADO',
        schedule: null,
      };
      mockScheduleLookupService.lookup.mockResolvedValue(lookupResult);

      const result = await service.lookup(10, 1, '2026-12-25');

      expect(result.is_holiday).toBe(true);
      expect(result.schedule).toBeNull();
    });
  });
});
