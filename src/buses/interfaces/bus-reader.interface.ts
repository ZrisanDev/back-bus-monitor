import { Bus } from '../entities/bus.entity';

export interface IBusReader {
  findOne(id: number): Promise<Bus>;
  findByCode(code: string): Promise<Bus | null>;
}
