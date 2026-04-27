import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Report } from './entities/report.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { LastStatusQueryService } from './services/last-status-query.service';
import { BackfillPreviewService } from './services/backfill-preview.service';
import { BackfillExecuteService } from './services/backfill-execute.service';
import type { ICapacityValidator } from '../buses/validators/capacity.validator.interface';
import type { IBusReader } from '../buses/interfaces/bus-reader.interface';
import { RouteStop } from '../route-stops/entities/route-stop.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(RouteStop)
    private readonly routeStopRepository: Repository<RouteStop>,
    @Inject('IBusReader')
    private readonly busReader: IBusReader,
    private readonly lastStatusQueryService: LastStatusQueryService,
    private readonly backfillPreviewService: BackfillPreviewService,
    private readonly backfillExecuteService: BackfillExecuteService,
    @Inject('ICapacityValidator')
    private readonly capacityValidator: ICapacityValidator,
    @Inject('IBusAssignmentsService')
    private readonly assignmentsService: any,
  ) {}

  async create(busId: number, dto: CreateReportDto): Promise<Report> {
    // Validate bus exists (throws NotFoundException if not found)
    const bus = await this.busReader.findOne(busId);

    // Validate using extensible strategy chain (OCP)
    this.capacityValidator.validate(dto, bus);

    // Resolve latitude/longitude from the first stop of the active route if not provided
    let latitude: number;
    let longitude: number;
    let resolvedRouteId = dto.route_id;
    let resolvedStopId = dto.stop_id;

    if (!dto.route_id) {
      // No route provided → get active assignment
      const assignment = await this.assignmentsService.findActiveByBusId(busId);
      if (assignment) {
        resolvedRouteId = Number(assignment.route_id);
      }
    }

    if (!resolvedRouteId) {
      throw new BadRequestException(
        `El bus ${busId} no tiene una ruta asignada. Asigne una ruta al bus o envíe route_id en el body.`,
      );
    }

    if (resolvedRouteId) {
      // Get the first stop of the route
      const firstStop = await this.routeStopRepository.findOne({
        where: { route_id: resolvedRouteId, stop_order: 1 },
        relations: ['stop'],
      });
      if (firstStop) {
        resolvedStopId = Number(firstStop.stop_id);
        latitude = Number(firstStop.stop.latitude);
        longitude = Number(firstStop.stop.longitude);
      }
    }

    // Fallback to 0,0 if still no coordinates
    latitude ??= 0;
    longitude ??= 0;

    const report = this.reportRepository.create({
      bus_id: busId,
      passenger_count: dto.passenger_count,
      route_id: resolvedRouteId ?? null,
      stop_id: resolvedStopId ?? null,
      latitude,
      longitude,
      status: dto.status ?? null,
      current_stop: dto.current_stop ?? null,
      next_stop: dto.next_stop ?? null,
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
      status?: string;
      current_stop?: string;
      next_stop?: string | null;
    },
  ): Promise<Report> {
    const dto = new CreateReportDto();
    dto.passenger_count = telemetry.passenger_count;
    dto.route_id = telemetry.route_id;
    dto.stop_id = telemetry.stop_id;
    dto.status = telemetry.status;
    dto.current_stop = telemetry.current_stop;
    dto.next_stop = telemetry.next_stop;

    // Bypass auto-fill: call create directly with known lat/lng
    return this.createWithCoordinates(busId, dto, telemetry.latitude, telemetry.longitude);
  }

  /**
   * Internal method to create a report with pre-resolved coordinates.
   * Used by createFromTelemetry (Kafka stream) where lat/lng are already known.
   */
  private async createWithCoordinates(
    busId: number,
    dto: CreateReportDto,
    latitude: number,
    longitude: number,
  ): Promise<Report> {
    const bus = await this.busReader.findOne(busId);
    this.capacityValidator.validate(dto, bus);

    const report = this.reportRepository.create({
      bus_id: busId,
      passenger_count: dto.passenger_count,
      route_id: dto.route_id ?? null,
      stop_id: dto.stop_id ?? null,
      latitude,
      longitude,
      status: dto.status ?? null,
      current_stop: dto.current_stop ?? null,
      next_stop: dto.next_stop ?? null,
      bus,
    });

    return this.reportRepository.save(report);
  }
}
