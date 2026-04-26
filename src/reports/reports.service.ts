import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Report } from './entities/report.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { LastStatusQueryService } from './services/last-status-query.service';
import { BackfillPreviewService } from './services/backfill-preview.service';
import { BackfillExecuteService } from './services/backfill-execute.service';
import type { ICapacityValidator } from '../buses/validators/capacity.validator.interface';
import type { IBusReader } from '../buses/interfaces/bus-reader.interface';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @Inject('IBusReader')
    private readonly busReader: IBusReader,
    private readonly lastStatusQueryService: LastStatusQueryService,
    private readonly backfillPreviewService: BackfillPreviewService,
    private readonly backfillExecuteService: BackfillExecuteService,
    @Inject('ICapacityValidator')
    private readonly capacityValidator: ICapacityValidator,
  ) {}

  async create(busId: number, dto: CreateReportDto): Promise<Report> {
    // Validate bus exists (throws NotFoundException if not found)
    const bus = await this.busReader.findOne(busId);

    // Validate using extensible strategy chain (OCP)
    this.capacityValidator.validate(dto, bus);

    const report = this.reportRepository.create({
      bus_id: busId,
      passenger_count: dto.passenger_count,
      route_id: dto.route_id ?? null,
      stop_id: dto.stop_id ?? null,
      latitude: dto.latitude,
      longitude: dto.longitude,
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

  async getLastStatusAll(filter?: string): Promise<any[]> {
    return this.lastStatusQueryService.execute(filter);
  }

  async findReportsByBus(
    busId: number,
    page: number,
    limit: number,
    from?: string,
    to?: string,
  ): Promise<any> {
    // Validate bus exists
    await this.busReader.findOne(busId);

    const where: any = { bus_id: busId };

    if (from && to) {
      where.timestamp = Between(new Date(from), new Date(to));
    } else if (from) {
      where.timestamp = MoreThanOrEqual(new Date(from));
    } else if (to) {
      where.timestamp = LessThanOrEqual(new Date(to));
    }

    const [data, total] = await this.reportRepository.findAndCount({
      where,
      order: { timestamp: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBackfillPreview(): Promise<any> {
    return this.backfillPreviewService.execute();
  }

  async executeBackfill(): Promise<any> {
    return this.backfillExecuteService.execute();
  }

  async createFromTelemetry(
    busId: number,
    telemetry: {
      passenger_count: number;
      route_id: number;
      stop_id: number;
      latitude: number;
      longitude: number;
    },
  ): Promise<Report> {
    const dto = new CreateReportDto();
    dto.passenger_count = telemetry.passenger_count;
    dto.route_id = telemetry.route_id;
    dto.stop_id = telemetry.stop_id;
    dto.latitude = telemetry.latitude;
    dto.longitude = telemetry.longitude;

    return this.create(busId, dto);
  }
}
