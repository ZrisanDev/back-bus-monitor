import { DayType } from '../entities/day-type.entity';
import { CreateDayTypeDto } from '../dto/create-day-type.dto';
import { UpdateDayTypeDto } from '../dto/update-day-type.dto';

export interface IDayTypesService {
  create(dto: CreateDayTypeDto): Promise<DayType>;
  findAll(): Promise<DayType[]>;
  findOne(id: number): Promise<DayType>;
  update(id: number, dto: UpdateDayTypeDto): Promise<DayType>;
  remove(id: number): Promise<DayType>;
}
