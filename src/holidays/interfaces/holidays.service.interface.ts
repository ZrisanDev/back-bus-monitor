import { Holiday } from '../entities/holiday.entity';
import { CreateHolidayDto } from '../dto/create-holiday.dto';
import { UpdateHolidayDto } from '../dto/update-holiday.dto';

export interface IHolidaysService {
  create(dto: CreateHolidayDto): Promise<Holiday>;
  findAll(): Promise<Holiday[]>;
  findOne(id: number): Promise<Holiday>;
  update(id: number, dto: UpdateHolidayDto): Promise<Holiday>;
  remove(id: number): Promise<Holiday>;
}
