import { Test, TestingModule } from '@nestjs/testing';
import { BackfillExecuteService } from '../backfill-execute.service';
import { Report } from '../../entities/report.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('BackfillExecuteService', () => {
  let service: BackfillExecuteService;
  let mockReportRepository: {
    query: jest.Mock;
  };

  beforeEach(async () => {
    mockReportRepository = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackfillExecuteService,
        {
          provide: getRepositoryToken(Report),
          useValue: mockReportRepository,
        },
      ],
    }).compile();

    service = module.get<BackfillExecuteService>(BackfillExecuteService);
  });

  // Helper to mock both queries (update + remaining count)
  function mockBothQueries(affectedRows: number, remaining: number) {
    mockReportRepository.query
      .mockResolvedValueOnce({ affected_rows: String(affectedRows) })
      .mockResolvedValueOnce([{ remaining: String(remaining) }]);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // execute — backfills route_id/stop_id from bus assignments
  // ═══════════════════════════════════════════════════════════════════════

  describe('execute', () => {
    // ── SCN: Reports with matching assignments get backfilled ────────────

    it('should backfill route_id from active bus assignment at report timestamp', async () => {
      mockBothQueries(5, 3);

      const result = await service.execute();

      expect(result.updated_count).toBe(5);
      // Verify the query joins bus_assignments to find route_id
      const sql = mockReportRepository.query.mock.calls[0][0] as string;
      expect(sql).toContain('bus_assignments');
      expect(sql).toContain('route_id');
    });

    // ── SCN: Triangulation — zero rows need backfill ─────────────────────

    it('should return zero when no reports need backfill', async () => {
      mockBothQueries(0, 0);

      const result = await service.execute();

      expect(result.updated_count).toBe(0);
    });

    // ── SCN: Triangulation — large batch ─────────────────────────────────

    it('should handle large number of backfilled rows', async () => {
      mockBothQueries(500, 0);

      const result = await service.execute();

      expect(result.updated_count).toBe(500);
    });

    // ── SCN: Returns remaining null count ─────────────────────────────────

    it('should report remaining nulls after backfill', async () => {
      mockBothQueries(5, 3);

      const result = await service.execute();

      expect(result.updated_count).toBe(5);
      expect(result.remaining_nulls).toBe(3);
    });

    // ── SCN: Triangulation — all resolved ────────────────────────────────

    it('should report zero remaining nulls when all resolved', async () => {
      mockBothQueries(150, 0);

      const result = await service.execute();

      expect(result.updated_count).toBe(150);
      expect(result.remaining_nulls).toBe(0);
    });

    // ── SCN: Returns descriptive message ──────────────────────────────────

    it('should return a descriptive message', async () => {
      mockBothQueries(5, 3);

      const result = await service.execute();

      expect(result.message).toBeDefined();
      expect(typeof result.message).toBe('string');
      expect(result.message).toContain('5');
      expect(result.message).toContain('3');
    });
  });
});
