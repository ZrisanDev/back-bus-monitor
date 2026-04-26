import { Schedule } from '../entities/schedule.entity';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { UpdateScheduleDto } from '../dto/update-schedule.dto';
import { ScheduleLookupResult } from '../services/schedule-lookup.service';

export interface ISchedulesService {
  create(dto: CreateScheduleDto): Promise<Schedule>;
  findAll(): Promise<Schedule[]>;
  findOne(id: number): Promise<Schedule>;
  update(id: number, dto: UpdateScheduleDto): Promise<Schedule>;
  remove(id: number): Promise<Schedule>;
  lookup(
    routeId: number,
    directionId: number,
    date: string,
  ): Promise<ScheduleLookupResult>;
}
