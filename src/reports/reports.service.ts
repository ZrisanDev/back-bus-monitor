import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async getLastStatusAll(): Promise<any[]> {
    return this.lastStatusQueryService.execute();
  }

  async getBackfillPreview(): Promise<any> {
    return this.backfillPreviewService.execute();
  }

  async executeBackfill(): Promise<any> {
    return this.backfillExecuteService.execute();
  }
}
