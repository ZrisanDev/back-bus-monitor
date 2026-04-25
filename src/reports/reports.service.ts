import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from './entities/report.entity';
import { BusesService } from '../buses/buses.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    private readonly busesService: BusesService,
  ) {}

  async create(busId: number, dto: CreateReportDto): Promise<Report> {
    // Validate bus exists (throws NotFoundException if not found)
    const bus = await this.busesService.findOne(busId);

    // Validate capacity (bus already loaded, use it directly)
    if (dto.passenger_count > bus.capacity) {
      throw new UnprocessableEntityException(
        `La cantidad de pasajeros (${dto.passenger_count}) excede la capacidad del bus (${bus.capacity})`,
      );
    }

    const report = this.reportRepository.create({
      bus_id: busId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      passenger_count: dto.passenger_count,
      bus,
    });

    return this.reportRepository.save(report);
  }

  async findAllByBus(busId: number): Promise<Report[]> {
    return this.reportRepository.find({
      where: { bus_id: busId },
      order: { timestamp: 'DESC' },
    });
  }

  async findBusCapacity(busId: number): Promise<number> {
    const bus = await this.busesService.findOne(busId);
    return bus.capacity;
  }

  async getLastStatusAll(): Promise<any[]> {
    const rawResults = await this.reportRepository.query(`
      SELECT
        b.id AS bus_id,
        b.code AS bus_code,
        b.capacity AS bus_capacity,
        r.latitude,
        r.longitude,
        r.passenger_count,
        r.timestamp
      FROM buses b
      LEFT JOIN LATERAL (
        SELECT latitude, longitude, passenger_count, timestamp
        FROM reports
        WHERE bus_id = b.id
        ORDER BY timestamp DESC
        LIMIT 1
      ) r ON true
      ORDER BY r.timestamp DESC NULLS LAST, b.id ASC
    `);

    return rawResults.map((row: any) => ({
      bus_id: Number(row.bus_id),
      bus_code: row.bus_code,
      bus_capacity: Number(row.bus_capacity),
      latitude: row.latitude !== null ? Number(row.latitude) : null,
      longitude: row.longitude !== null ? Number(row.longitude) : null,
      passenger_count:
        row.passenger_count !== null ? Number(row.passenger_count) : null,
      timestamp: row.timestamp,
    }));
  }
}
