import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from '../entities/report.entity';

export interface BackfillPreviewResult {
  total_reports: number;
  with_route_and_stop: number;
  missing_route_id: number;
  missing_stop_id: number;
  sample_affected: Array<{
    id: number;
    bus_id: number;
    passenger_count: number;
    timestamp: string | Date;
  }>;
}

@Injectable()
export class BackfillPreviewService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
  ) {}

  async execute(): Promise<BackfillPreviewResult> {
    // Summary counts
    const summaryRows = await this.reportRepository.query(`
      SELECT
        COUNT(*) AS total_reports,
        COUNT(*) FILTER (WHERE route_id IS NOT NULL AND stop_id IS NOT NULL) AS with_route_and_stop,
        COUNT(*) FILTER (WHERE route_id IS NULL) AS missing_route_id,
        COUNT(*) FILTER (WHERE stop_id IS NULL) AS missing_stop_id
      FROM reports
    `);

    const summary = summaryRows[0];

    // Sample affected rows (up to 10)
    const samples = await this.reportRepository.query(`
      SELECT id, bus_id, passenger_count, timestamp
      FROM reports
      WHERE route_id IS NULL OR stop_id IS NULL
      ORDER BY id ASC
      LIMIT 10
    `);

    return {
      total_reports: Number(summary.total_reports),
      with_route_and_stop: Number(summary.with_route_and_stop),
      missing_route_id: Number(summary.missing_route_id),
      missing_stop_id: Number(summary.missing_stop_id),
      sample_affected: samples.map((row: any) => ({
        id: Number(row.id),
        bus_id: Number(row.bus_id),
        passenger_count: Number(row.passenger_count),
        timestamp: row.timestamp,
      })),
    };
  }
}
