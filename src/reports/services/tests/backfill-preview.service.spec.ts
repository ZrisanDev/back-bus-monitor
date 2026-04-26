import { Test, TestingModule } from '@nestjs/testing';
import { BackfillPreviewService } from '../backfill-preview.service';
import { Report } from '../../entities/report.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('BackfillPreviewService', () => {
  let service: BackfillPreviewService;
  let mockReportRepository: {
    query: jest.Mock;
  };

  beforeEach(async () => {
    mockReportRepository = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackfillPreviewService,
        {
          provide: getRepositoryToken(Report),
          useValue: mockReportRepository,
        },
      ],
    }).compile();

    service = module.get<BackfillPreviewService>(BackfillPreviewService);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // execute — returns backfill preview summary
  // ═══════════════════════════════════════════════════════════════════════

  describe('execute', () => {
    // ── SCN: All reports missing route_id and stop_id ────────────────────

    it('should return summary with all reports missing route_id and stop_id', async () => {
      mockReportRepository.query.mockResolvedValue([
        { total_reports: '150', with_route_and_stop: '0', missing_route_id: '150', missing_stop_id: '150' },
      ]);

      const result = await service.execute();

      expect(result.total_reports).toBe(150);
      expect(result.with_route_and_stop).toBe(0);
      expect(result.missing_route_id).toBe(150);
      expect(result.missing_stop_id).toBe(150);
    });

    // ── SCN: Triangulation — partial backfill ────────────────────────────

    it('should return correct counts for partial backfill', async () => {
      mockReportRepository.query.mockResolvedValue([
        { total_reports: '200', with_route_and_stop: '120', missing_route_id: '80', missing_stop_id: '50' },
      ]);

      const result = await service.execute();

      expect(result.total_reports).toBe(200);
      expect(result.with_route_and_stop).toBe(120);
      expect(result.missing_route_id).toBe(80);
      expect(result.missing_stop_id).toBe(50);
    });

    // ── SCN: Fully backfilled reports ────────────────────────────────────

    it('should return zero missing when all reports are backfilled', async () => {
      mockReportRepository.query.mockResolvedValue([
        { total_reports: '50', with_route_and_stop: '50', missing_route_id: '0', missing_stop_id: '0' },
      ]);

      const result = await service.execute();

      expect(result.total_reports).toBe(50);
      expect(result.with_route_and_stop).toBe(50);
      expect(result.missing_route_id).toBe(0);
      expect(result.missing_stop_id).toBe(0);
    });

    // ── SCN: Sample affected reports included ────────────────────────────

    it('should include sample_affected reports in the result', async () => {
      mockReportRepository.query
        .mockResolvedValueOnce([
          { total_reports: '10', with_route_and_stop: '5', missing_route_id: '5', missing_stop_id: '5' },
        ])
        .mockResolvedValueOnce([
          { id: '1', bus_id: '5', passenger_count: 22, timestamp: new Date('2025-06-15T12:00:00.000Z') },
          { id: '2', bus_id: '3', passenger_count: 15, timestamp: new Date('2025-06-15T13:00:00.000Z') },
        ]);

      const result = await service.execute();

      expect(result.sample_affected).toHaveLength(2);
      expect(result.sample_affected[0].id).toBe(1);
      expect(result.sample_affected[0].bus_id).toBe(5);
      expect(result.sample_affected[0].passenger_count).toBe(22);
      expect(result.sample_affected[1].id).toBe(2);
      expect(result.sample_affected[1].bus_id).toBe(3);
      expect(result.sample_affected[1].passenger_count).toBe(15);
    });

    // ── SCN: Sample affected limited to 10 rows ─────────────────────────

    it('should limit sample_affected to 10 rows via SQL LIMIT', async () => {
      mockReportRepository.query
        .mockResolvedValueOnce([
          { total_reports: '100', with_route_and_stop: '0', missing_route_id: '100', missing_stop_id: '100' },
        ])
        .mockResolvedValueOnce([
          { id: '1', bus_id: '1', passenger_count: 10, timestamp: new Date('2025-01-01T00:00:00.000Z') },
        ]);

      await service.execute();

      // Second query should be the sample query with LIMIT 10
      const sampleQuery = mockReportRepository.query.mock.calls[1][0] as string;
      expect(sampleQuery).toContain('LIMIT 10');
    });

    // ── SCN: No reports at all ───────────────────────────────────────────

    it('should return zero totals when no reports exist', async () => {
      mockReportRepository.query
        .mockResolvedValueOnce([
          { total_reports: '0', with_route_and_stop: '0', missing_route_id: '0', missing_stop_id: '0' },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.execute();

      expect(result.total_reports).toBe(0);
      expect(result.sample_affected).toEqual([]);
    });

    // ── SCN: Triangulation — BIGINT normalized to number ─────────────────

    it('should normalize BIGINT string IDs in sample_affected to numbers', async () => {
      mockReportRepository.query
        .mockResolvedValueOnce([
          { total_reports: '3', with_route_and_stop: '0', missing_route_id: '3', missing_stop_id: '3' },
        ])
        .mockResolvedValueOnce([
          { id: '999', bus_id: '42', passenger_count: 5, timestamp: new Date('2025-03-01T08:00:00.000Z') },
        ]);

      const result = await service.execute();

      expect(result.sample_affected[0].id).toBe(999);
      expect(typeof result.sample_affected[0].id).toBe('number');
      expect(result.sample_affected[0].bus_id).toBe(42);
      expect(typeof result.sample_affected[0].bus_id).toBe('number');
    });
  });
});
