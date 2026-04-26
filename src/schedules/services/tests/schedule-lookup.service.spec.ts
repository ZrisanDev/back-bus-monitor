import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ScheduleLookupService } from '../schedule-lookup.service';
import { Schedule } from '../../entities/schedule.entity';

describe('ScheduleLookupService', () => {
  let service: ScheduleLookupService;
  let mockScheduleRepository: {
    query: jest.Mock;
  };

  beforeEach(async () => {
    mockScheduleRepository = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleLookupService,
        {
          provide: getRepositoryToken(Schedule),
          useValue: mockScheduleRepository,
        },
      ],
    }).compile();

    service = module.get<ScheduleLookupService>(ScheduleLookupService);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // lookup — resolves day_type and finds schedule
  // ═══════════════════════════════════════════════════════════════════════

  describe('lookup', () => {
    // ── SCN: Regular weekday returns LUNES_VIERNES schedule ───────────────

    it('should return schedule for a regular weekday (LUNES_VIERNES)', async () => {
      // 2026-04-27 is a Monday
      mockScheduleRepository.query.mockResolvedValue([
        {
          is_holiday: false,
          day_type_code: 'LUNES_VIERNES',
          start_time: '05:15:00',
          end_time: '20:20:00',
          is_operating: true,
        },
      ]);

      const result = await service.lookup(5, 2, '2026-04-27');

      expect(result.date).toBe('2026-04-27');
      expect(result.is_holiday).toBe(false);
      expect(result.day_type).toBe('LUNES_VIERNES');
      expect(result.schedule).toEqual({
        start_time: '05:15:00',
        end_time: '20:20:00',
        is_operating: true,
      });
    });

    // ── SCN: Saturday returns SABADO schedule ─────────────────────────────

    it('should return schedule for a Saturday (SABADO)', async () => {
      // 2026-04-25 is a Saturday
      mockScheduleRepository.query.mockResolvedValue([
        {
          is_holiday: false,
          day_type_code: 'SABADO',
          start_time: '06:00:00',
          end_time: '14:00:00',
          is_operating: true,
        },
      ]);

      const result = await service.lookup(5, 2, '2026-04-25');

      expect(result.date).toBe('2026-04-25');
      expect(result.is_holiday).toBe(false);
      expect(result.day_type).toBe('SABADO');
      expect(result.schedule.start_time).toBe('06:00:00');
    });

    // ── SCN: Sunday returns DOMINGO schedule ──────────────────────────────

    it('should return schedule for a Sunday (DOMINGO)', async () => {
      // 2026-04-26 is a Sunday
      mockScheduleRepository.query.mockResolvedValue([
        {
          is_holiday: false,
          day_type_code: 'DOMINGO',
          start_time: null,
          end_time: null,
          is_operating: false,
        },
      ]);

      const result = await service.lookup(5, 2, '2026-04-26');

      expect(result.date).toBe('2026-04-26');
      expect(result.is_holiday).toBe(false);
      expect(result.day_type).toBe('DOMINGO');
      expect(result.schedule.is_operating).toBe(false);
    });

    // ── SCN: Holiday overrides day_of_week → FERIADO schedule ─────────────

    it('should return FERIADO schedule when date is a holiday', async () => {
      // Even though 2026-04-27 is a Monday, it's a holiday
      mockScheduleRepository.query.mockResolvedValue([
        {
          is_holiday: true,
          day_type_code: 'FERIADO',
          start_time: '08:00:00',
          end_time: '13:00:00',
          is_operating: true,
        },
      ]);

      const result = await service.lookup(5, 2, '2026-04-27');

      expect(result.is_holiday).toBe(true);
      expect(result.day_type).toBe('FERIADO');
      expect(result.schedule.start_time).toBe('08:00:00');
    });

    // ── SCN: Holiday with no FERIADO schedule returns null schedule ───────

    it('should return null schedule when holiday has no FERIADO schedule', async () => {
      mockScheduleRepository.query.mockResolvedValue([
        {
          is_holiday: true,
          day_type_code: 'FERIADO',
          start_time: null,
          end_time: null,
          is_operating: null,
        },
      ]);

      const result = await service.lookup(5, 2, '2026-12-25');

      expect(result.date).toBe('2026-12-25');
      expect(result.is_holiday).toBe(true);
      expect(result.day_type).toBe('FERIADO');
      expect(result.schedule).toBeNull();
    });

    // ── SCN: Regular weekday with no schedule returns null schedule ───────

    it('should return null schedule when no schedule exists for that combo', async () => {
      mockScheduleRepository.query.mockResolvedValue([
        {
          is_holiday: false,
          day_type_code: 'LUNES_VIERNES',
          start_time: null,
          end_time: null,
          is_operating: null,
        },
      ]);

      const result = await service.lookup(999, 999, '2026-04-27');

      expect(result.is_holiday).toBe(false);
      expect(result.day_type).toBe('LUNES_VIERNES');
      expect(result.schedule).toBeNull();
    });

    // ── SCN: Triangulation — different route and direction ────────────────

    it('should pass route_id and direction_id to query for different routes', async () => {
      mockScheduleRepository.query.mockResolvedValue([
        {
          is_holiday: false,
          day_type_code: 'SABADO',
          start_time: '07:00:00',
          end_time: '15:00:00',
          is_operating: true,
        },
      ]);

      const result = await service.lookup(10, 1, '2026-04-25');

      expect(result.schedule.start_time).toBe('07:00:00');
      // Verify query was called with parameters
      const queryCall = mockScheduleRepository.query.mock.calls[0];
      expect(queryCall[1]).toEqual(['2026-04-25', 10, 1]);
    });

    // ── SCN: SQL uses day_types, holidays, and schedules tables ───────────

    it('should query using holidays, day_types, and schedules tables', async () => {
      mockScheduleRepository.query.mockResolvedValue([
        {
          is_holiday: false,
          day_type_code: 'LUNES_VIERNES',
          start_time: null,
          end_time: null,
          is_operating: null,
        },
      ]);

      await service.lookup(1, 1, '2026-04-27');

      const sql = mockScheduleRepository.query.mock.calls[0][0] as string;
      expect(sql).toContain('holidays');
      expect(sql).toContain('day_types');
      expect(sql).toContain('schedules');
    });

    // ── SCN: Triangulation — holiday on a weekend ────────────────────────

    it('should override weekend with FERIADO when holiday falls on Saturday', async () => {
      mockScheduleRepository.query.mockResolvedValue([
        {
          is_holiday: true,
          day_type_code: 'FERIADO',
          start_time: '09:00:00',
          end_time: '12:00:00',
          is_operating: true,
        },
      ]);

      const result = await service.lookup(5, 2, '2026-04-25');

      expect(result.is_holiday).toBe(true);
      expect(result.day_type).toBe('FERIADO');
      expect(result.schedule.start_time).toBe('09:00:00');
    });

    // ── SCN: Boolean is_operating is correctly mapped ─────────────────────

    it('should correctly map is_operating boolean from query result', async () => {
      mockScheduleRepository.query.mockResolvedValue([
        {
          is_holiday: false,
          day_type_code: 'DOMINGO',
          start_time: null,
          end_time: null,
          is_operating: false,
        },
      ]);

      const result = await service.lookup(5, 2, '2026-04-26');

      expect(result.schedule.is_operating).toBe(false);
    });
  });
});
