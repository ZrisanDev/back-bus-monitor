import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LastStatusQueryService } from '../last-status-query.service';
import { Report } from '../../entities/report.entity';

describe('LastStatusQueryService', () => {
  let service: LastStatusQueryService;
  let mockReportRepository: {
    query: jest.Mock;
  };

  beforeEach(async () => {
    mockReportRepository = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LastStatusQueryService,
        {
          provide: getRepositoryToken(Report),
          useValue: mockReportRepository,
        },
      ],
    }).compile();

    service = module.get<LastStatusQueryService>(LastStatusQueryService);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // execute — queries raw SQL and maps rows
  // ═══════════════════════════════════════════════════════════════════════

  describe('execute', () => {
    // ── SCN: Returns mapped status for buses with reports ─────────────────

    it('should query raw SQL and map rows to structured response', async () => {
      const rawResults = [
        {
          bus_id: '1',
          bus_code: 'BUS-001',
          bus_capacity: 40,
          passenger_count: 22,
          timestamp: new Date('2025-06-15T12:00:00.000Z'),
        },
      ];
      mockReportRepository.query.mockResolvedValue(rawResults);

      const result = await service.execute();

      expect(result).toHaveLength(1);
      expect(result[0].bus_id).toBe(1);
      expect(result[0].bus_code).toBe('BUS-001');
      expect(result[0].bus_capacity).toBe(40);
      expect(result[0].passenger_count).toBe(22);
      expect(mockReportRepository.query).toHaveBeenCalledTimes(1);
    });

    // ── SCN: Buses without reports have null values ───────────────────────

    it('should include buses without reports with null numeric fields', async () => {
      const rawResults = [
        {
          bus_id: '1',
          bus_code: 'BUS-001',
          bus_capacity: 40,
          passenger_count: 22,
          timestamp: new Date('2025-06-15T12:00:00.000Z'),
        },
        {
          bus_id: '2',
          bus_code: 'BUS-002',
          bus_capacity: 60,
          passenger_count: null,
          timestamp: null,
        },
      ];
      mockReportRepository.query.mockResolvedValue(rawResults);

      const result = await service.execute();

      expect(result).toHaveLength(2);
      expect(result[1].bus_id).toBe(2);
      expect(result[1].bus_code).toBe('BUS-002');
      expect(result[1].bus_capacity).toBe(60);
      expect(result[1].passenger_count).toBeNull();
      expect(result[1].timestamp).toBeNull();
    });

    // ── SCN: Triangulation — BIGINT string IDs normalized to numbers ──────

    it('should normalize BIGINT string IDs to numbers', async () => {
      const rawResults = [
        {
          bus_id: '42',
          bus_code: 'BUS-042',
          bus_capacity: 50,
          passenger_count: 10,
          timestamp: new Date('2025-06-15T14:00:00.000Z'),
        },
      ];
      mockReportRepository.query.mockResolvedValue(rawResults);

      const result = await service.execute();

      expect(result[0].bus_id).toBe(42);
      expect(typeof result[0].bus_id).toBe('number');
    });

    // ── SCN: Empty result when no buses exist ─────────────────────────────

    it('should return empty array when no buses exist', async () => {
      mockReportRepository.query.mockResolvedValue([]);

      const result = await service.execute();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TASK-013: execute — enriched with route/stop context
  // ═══════════════════════════════════════════════════════════════════════

  describe('execute (enriched with route/stop)', () => {
    // ── SCN: Bus with report that has route and stop returns enriched data ─

    it('should include route_id, route_name, stop_id, stop_name from report', async () => {
      const rawResults = [
        {
          bus_id: '1',
          bus_code: 'BUS-001',
          bus_capacity: 40,
          passenger_count: 22,
          timestamp: new Date('2025-06-15T12:00:00.000Z'),
          route_id: '5',
          route_name: 'Expreso 5',
          stop_id: '3',
          stop_name: 'UNI',
        },
      ];
      mockReportRepository.query.mockResolvedValue(rawResults);

      const result = await service.execute();

      expect(result).toHaveLength(1);
      expect(result[0].route_id).toBe(5);
      expect(result[0].route_name).toBe('Expreso 5');
      expect(result[0].stop_id).toBe(3);
      expect(result[0].stop_name).toBe('UNI');
    });

    // ── SCN: Triangulation — different route and stop values ──────────────

    it('should map different route and stop values correctly', async () => {
      const rawResults = [
        {
          bus_id: '2',
          bus_code: 'BUS-002',
          bus_capacity: 60,
          passenger_count: 30,
          timestamp: new Date('2025-06-15T13:00:00.000Z'),
          route_id: '10',
          route_name: 'Línea 10',
          stop_id: '7',
          stop_name: 'Terminal',
        },
      ];
      mockReportRepository.query.mockResolvedValue(rawResults);

      const result = await service.execute();

      expect(result[0].route_id).toBe(10);
      expect(result[0].route_name).toBe('Línea 10');
      expect(result[0].stop_id).toBe(7);
      expect(result[0].stop_name).toBe('Terminal');
    });

    // ── SCN: Bus without route/stop data returns explicit nulls ───────────

    it('should return null for route/stop fields when no report or no assignment', async () => {
      const rawResults = [
        {
          bus_id: '3',
          bus_code: 'BUS-003',
          bus_capacity: 40,
          passenger_count: null,
          timestamp: null,
          route_id: null,
          route_name: null,
          stop_id: null,
          stop_name: null,
        },
      ];
      mockReportRepository.query.mockResolvedValue(rawResults);

      const result = await service.execute();

      expect(result[0].route_id).toBeNull();
      expect(result[0].route_name).toBeNull();
      expect(result[0].stop_id).toBeNull();
      expect(result[0].stop_name).toBeNull();
    });

    // ── SCN: SQL query includes LEFT JOINs to routes, stops, bus_assignments ─

    it('should use LEFT JOINs to routes, stops, and bus_assignments in SQL', async () => {
      mockReportRepository.query.mockResolvedValue([]);

      await service.execute();

      const sql = mockReportRepository.query.mock.calls[0][0] as string;
      expect(sql).toContain('LEFT JOIN');
      expect(sql).toContain('routes');
      expect(sql).toContain('stops');
      expect(sql).toContain('bus_assignments');
    });

    // ── SCN: SQL selects route and stop columns ───────────────────────────

    it('should select route_id, route_name, stop_id, stop_name in SQL', async () => {
      mockReportRepository.query.mockResolvedValue([]);

      await service.execute();

      const sql = mockReportRepository.query.mock.calls[0][0] as string;
      expect(sql).toContain('route_id');
      expect(sql).toContain('route_name');
      expect(sql).toContain('stop_id');
      expect(sql).toContain('stop_name');
    });

    // ── SCN: Mixed results — some buses with route, some without ──────────

    it('should handle mixed results where some buses have route/stop and others do not', async () => {
      const rawResults = [
        {
          bus_id: '1',
          bus_code: 'BUS-001',
          bus_capacity: 40,
          passenger_count: 22,
          timestamp: new Date('2025-06-15T12:00:00.000Z'),
          route_id: '5',
          route_name: 'Expreso 5',
          stop_id: '3',
          stop_name: 'UNI',
        },
        {
          bus_id: '2',
          bus_code: 'BUS-002',
          bus_capacity: 60,
          passenger_count: null,
          timestamp: null,
          route_id: null,
          route_name: null,
          stop_id: null,
          stop_name: null,
        },
      ];
      mockReportRepository.query.mockResolvedValue(rawResults);

      const result = await service.execute();

      expect(result).toHaveLength(2);
      // First bus has route/stop
      expect(result[0].route_id).toBe(5);
      expect(result[0].route_name).toBe('Expreso 5');
      expect(result[0].stop_id).toBe(3);
      expect(result[0].stop_name).toBe('UNI');
      // Second bus has nulls
      expect(result[1].route_id).toBeNull();
      expect(result[1].route_name).toBeNull();
      expect(result[1].stop_id).toBeNull();
      expect(result[1].stop_name).toBeNull();
    });

    // ── SCN: BIGINT route_id/stop_id normalized to numbers ────────────────

    it('should normalize BIGINT route_id and stop_id strings to numbers', async () => {
      const rawResults = [
        {
          bus_id: '1',
          bus_code: 'BUS-001',
          bus_capacity: 40,
          passenger_count: 22,
          timestamp: new Date('2025-06-15T12:00:00.000Z'),
          route_id: '999',
          route_name: 'Route 999',
          stop_id: '888',
          stop_name: 'Stop 888',
        },
      ];
      mockReportRepository.query.mockResolvedValue(rawResults);

      const result = await service.execute();

      expect(result[0].route_id).toBe(999);
      expect(typeof result[0].route_id).toBe('number');
      expect(result[0].stop_id).toBe(888);
      expect(typeof result[0].stop_id).toBe('number');
    });
  });
});