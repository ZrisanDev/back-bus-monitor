import { Stop } from '../entities/stop.entity';
import { CreateStopDto } from '../dto/create-stop.dto';
import { UpdateStopDto } from '../dto/update-stop.dto';

export interface IStopsService {
  create(dto: CreateStopDto): Promise<Stop>;
  findAll(): Promise<Stop[]>;
  findOne(id: number): Promise<Stop>;
  update(id: number, dto: UpdateStopDto): Promise<Stop>;
  remove(id: number): Promise<Stop>;
}
