import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from '../entities/report.entity';

export interface BackfillExecuteResult {
  updated_count: number;
  remaining_nulls: number;
  message: string;
}

@Injectable()
export class BackfillExecuteService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
  ) {}

  async execute(): Promise<BackfillExecuteResult> {
    // Update reports with NULL route_id by looking up the bus's active assignment
    // at the report's timestamp
    const updateResult = await this.reportRepository.query(`
      UPDATE reports r
      SET route_id = ba.route_id
      FROM bus_assignments ba
      WHERE r.route_id IS NULL
        AND r.bus_id = ba.bus_id
        AND ba.assigned_at <= r.timestamp
        AND (ba.unassigned_at IS NULL OR ba.unassigned_at > r.timestamp)
    `);

    const affectedRows = Number(updateResult?.affected_rows ?? updateResult ?? 0);

    // Count remaining NULLs
    const remainingRows = await this.reportRepository.query(`
      SELECT COUNT(*) AS remaining
      FROM reports
      WHERE route_id IS NULL OR stop_id IS NULL
    `);

    const remainingNulls = Number(remainingRows[0].remaining);

    return {
      updated_count: affectedRows,
      remaining_nulls: remainingNulls,
      message: `Backfill complete: ${affectedRows} reports updated, ${remainingNulls} remaining nulls`,
    };
  }
}
