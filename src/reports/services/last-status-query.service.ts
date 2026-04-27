import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from '../entities/report.entity';

const VALID_FILTERS = ['full', 'active', 'inactive'];

@Injectable()
export class LastStatusQueryService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
  ) {}

  async execute(filter?: string): Promise<any[]> {
    if (filter !== undefined && !VALID_FILTERS.includes(filter)) {
      throw new BadRequestException(
        `Invalid filter "${filter}". Valid values: full, active, inactive`,
      );
    }

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
        s.name AS stop_name,
        r.latitude,
        r.longitude,
        r.status,
        r.current_stop,
        r.next_stop
      FROM buses b
      LEFT JOIN LATERAL (
        SELECT passenger_count, timestamp, route_id, stop_id,
               latitude, longitude, status, current_stop, next_stop
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

    const mapped = rawResults.map((row: any) => ({
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
      latitude: row.latitude !== null ? Number(row.latitude) : null,
      longitude: row.longitude !== null ? Number(row.longitude) : null,
      status: row.status,
      current_stop: row.current_stop,
      next_stop: row.next_stop,
      occupancy_percentage:
        row.passenger_count !== null
          ? Math.round(
              (Number(row.passenger_count) / Number(row.bus_capacity)) *
                100 *
                100,
            ) / 100
          : null,
    }));

    if (filter === 'full') {
      return mapped.filter(
        (row: any) =>
          row.passenger_count !== null &&
          row.passenger_count >= row.bus_capacity,
      );
    }
    if (filter === 'active') {
      return mapped.filter((row: any) => row.timestamp !== null);
    }
    if (filter === 'inactive') {
      return mapped.filter((row: any) => row.timestamp === null);
    }

    return mapped;
  }
}
