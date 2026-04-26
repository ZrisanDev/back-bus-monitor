import { Direction } from '../entities/direction.entity';
import { CreateDirectionDto } from '../dto/create-direction.dto';
import { UpdateDirectionDto } from '../dto/update-direction.dto';

export interface IDirectionsService {
  create(dto: CreateDirectionDto): Promise<Direction>;
  findAll(): Promise<Direction[]>;
  findOne(id: number): Promise<Direction>;
  update(id: number, dto: UpdateDirectionDto): Promise<Direction>;
  remove(id: number): Promise<Direction>;
}
