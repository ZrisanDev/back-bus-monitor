import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from '../entities/report.entity';

@Injectable()
export class LastStatusQueryService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
  ) {}

  async execute(): Promise<any[]> {
    const rawResults = await this.reportRepository.query(`
      SELECT
        b.id AS bus_id,
        b.code AS bus_code,
        b.capacity AS bus_capacity,
        r.passenger_count,
        r.timestamp,
        COALESCE(r.route_id, ba.route_id) AS route_id,
        rt.name AS route_name,
        r.stop_id AS stop_id,
        s.name AS stop_name
      FROM buses b
      LEFT JOIN LATERAL (
        SELECT passenger_count, timestamp, route_id, stop_id
        FROM reports
        WHERE bus_id = b.id
        ORDER BY timestamp DESC
        LIMIT 1
      ) r ON true
      LEFT JOIN bus_assignments ba ON ba.bus_id = b.id AND ba.unassigned_at IS NULL
      LEFT JOIN routes rt ON rt.id = COALESCE(r.route_id, ba.route_id)
      LEFT JOIN stops s ON s.id = r.stop_id
      ORDER BY r.timestamp DESC NULLS LAST, b.id ASC
    `);

    return rawResults.map((row: any) => ({
      bus_id: Number(row.bus_id),
      bus_code: row.bus_code,
      bus_capacity: Number(row.bus_capacity),
      passenger_count:
        row.passenger_count !== null ? Number(row.passenger_count) : null,
      timestamp: row.timestamp,
      route_id:
        row.route_id !== null ? Number(row.route_id) : null,
      route_name: row.route_name,
      stop_id:
        row.stop_id !== null ? Number(row.stop_id) : null,
      stop_name: row.stop_name,
    }));
  }
}
