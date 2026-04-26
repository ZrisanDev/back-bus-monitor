import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from '../entities/schedule.entity';

export interface ScheduleLookupResult {
  date: string;
  is_holiday: boolean;
  day_type: string;
  schedule: {
    start_time: string;
    end_time: string;
    is_operating: boolean;
  } | null;
}

@Injectable()
export class ScheduleLookupService {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
  ) {}

  async lookup(
    routeId: number,
    directionId: number,
    date: string,
  ): Promise<ScheduleLookupResult> {
    const rows = await this.scheduleRepository.query(
      `
      WITH resolved_day_type AS (
        SELECT
          CASE
            WHEN EXISTS (SELECT 1 FROM holidays WHERE date = $1)
              THEN (SELECT id FROM day_types WHERE code = 'FERIADO')
            ELSE (
              SELECT id FROM day_types
              WHERE code = CASE
                WHEN EXTRACT(DOW FROM $1::date) IN (1,2,3,4,5) THEN 'LUNES_VIERNES'
                WHEN EXTRACT(DOW FROM $1::date) = 6 THEN 'SABADO'
                WHEN EXTRACT(DOW FROM $1::date) = 0 THEN 'DOMINGO'
              END
            )
          END AS day_type_id,
          EXISTS (SELECT 1 FROM holidays WHERE date = $1) AS is_holiday,
          CASE
            WHEN EXISTS (SELECT 1 FROM holidays WHERE date = $1) THEN 'FERIADO'
            ELSE (
              CASE
                WHEN EXTRACT(DOW FROM $1::date) IN (1,2,3,4,5) THEN 'LUNES_VIERNES'
                WHEN EXTRACT(DOW FROM $1::date) = 6 THEN 'SABADO'
                WHEN EXTRACT(DOW FROM $1::date) = 0 THEN 'DOMINGO'
              END
            )
          END AS day_type_code
      )
      SELECT
        rdt.is_holiday,
        rdt.day_type_code,
        s.start_time,
        s.end_time,
        s.is_operating
      FROM resolved_day_type rdt
      LEFT JOIN schedules s ON s.route_id = $2
        AND s.direction_id = $3
        AND s.day_type_id = rdt.day_type_id
      `,
      [date, routeId, directionId],
    );

    const row = rows[0];

    const hasSchedule =
      row.is_operating !== null && row.is_operating !== undefined;

    return {
      date,
      is_holiday: row.is_holiday,
      day_type: row.day_type_code,
      schedule: hasSchedule
        ? {
            start_time: row.start_time,
            end_time: row.end_time,
            is_operating: row.is_operating,
          }
        : null,
    };
  }
}
