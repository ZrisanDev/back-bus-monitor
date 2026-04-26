import { CreateBusDto } from '../dto/create-bus.dto';
import { Bus } from '../entities/bus.entity';
import { IBusReader } from './bus-reader.interface';

export interface IBusesService extends IBusReader {
  create(dto: CreateBusDto): Promise<Bus>;
  findAll(): Promise<Bus[]>;
  findBusCapacity(busId: number): Promise<number>;
}
