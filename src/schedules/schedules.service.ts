import { Injectable, ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from './entities/schedule.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ISchedulesService } from './interfaces/schedules.service.interface';
import { ScheduleLookupService, ScheduleLookupResult } from './services/schedule-lookup.service';

@Injectable()
export class SchedulesService implements ISchedulesService {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    private readonly scheduleLookupService: ScheduleLookupService,
  ) {}

  async create(dto: CreateScheduleDto): Promise<Schedule> {
    // Check UNIQUE(route_id, direction_id, day_type_id)
    const existing = await this.scheduleRepository.findOneBy({
      route_id: dto.route_id,
      direction_id: dto.direction_id,
      day_type_id: dto.day_type_id,
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe un horario para la ruta ${dto.route_id}, dirección ${dto.direction_id} y tipo de día ${dto.day_type_id}`,
      );
    }

    // Determine operating status
    const isOperating = dto.is_operating !== false;

    // Validate: operating schedules must have start_time < end_time
    if (isOperating) {
      if (!dto.start_time || !dto.end_time) {
        throw new UnprocessableEntityException(
          'Los horarios operativos deben tener hora de inicio y fin',
        );
      }
      if (dto.start_time >= dto.end_time) {
        throw new UnprocessableEntityException(
          'La hora de inicio debe ser anterior a la hora de fin',
        );
      }
    }

    const schedule = this.scheduleRepository.create({
      ...dto,
      is_operating: isOperating,
      start_time: isOperating ? dto.start_time! : null,
      end_time: isOperating ? dto.end_time! : null,
    });
    return this.scheduleRepository.save(schedule);
  }

  async findAll(): Promise<Schedule[]> {
    return this.scheduleRepository.find();
  }

  async findOne(id: number): Promise<Schedule> {
    const schedule = await this.scheduleRepository.findOneBy({ id });
    if (!schedule) {
      throw new NotFoundException(`Horario con ID ${id} no encontrado`);
    }
    return schedule;
  }

  async update(id: number, dto: UpdateScheduleDto): Promise<Schedule> {
    const schedule = await this.findOne(id);

    // Check for duplicate combination if changing route/direction/day_type
    const newRouteId = dto.route_id ?? schedule.route_id;
    const newDirectionId = dto.direction_id ?? schedule.direction_id;
    const newDayTypeId = dto.day_type_id ?? schedule.day_type_id;

    const comboChanged =
      (dto.route_id !== undefined && dto.route_id !== schedule.route_id) ||
      (dto.direction_id !== undefined && dto.direction_id !== schedule.direction_id) ||
      (dto.day_type_id !== undefined && dto.day_type_id !== schedule.day_type_id);

    if (comboChanged) {
      const existing = await this.scheduleRepository.findOneBy({
        route_id: newRouteId,
        direction_id: newDirectionId,
        day_type_id: newDayTypeId,
      });
      if (existing) {
        throw new ConflictException(
          `Ya existe un horario para la ruta ${newRouteId}, dirección ${newDirectionId} y tipo de día ${newDayTypeId}`,
        );
      }
    }

    // Determine effective operating status
    const isOperating = dto.is_operating !== undefined ? dto.is_operating : schedule.is_operating;

    // Validate time window for operating schedules
    if (isOperating) {
      const startTime = dto.start_time ?? schedule.start_time;
      const endTime = dto.end_time ?? schedule.end_time;

      if (!startTime || !endTime) {
        throw new UnprocessableEntityException(
          'Los horarios operativos deben tener hora de inicio y fin',
        );
      }
      if (startTime >= endTime) {
        throw new UnprocessableEntityException(
          'La hora de inicio debe ser anterior a la hora de fin',
        );
      }
    }

    Object.assign(schedule, {
      ...dto,
      is_operating: isOperating,
      start_time: isOperating ? (dto.start_time ?? schedule.start_time) : null,
      end_time: isOperating ? (dto.end_time ?? schedule.end_time) : null,
    });
    return this.scheduleRepository.save(schedule);
  }

  async remove(id: number): Promise<Schedule> {
    const schedule = await this.findOne(id);
    return this.scheduleRepository.remove(schedule);
  }

  async lookup(
    routeId: number,
    directionId: number,
    date: string,
  ): Promise<ScheduleLookupResult> {
    return this.scheduleLookupService.lookup(routeId, directionId, date);
  }
}
