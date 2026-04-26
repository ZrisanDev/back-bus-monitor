import { Route } from '../entities/route.entity';
import { CreateRouteDto } from '../dto/create-route.dto';
import { UpdateRouteDto } from '../dto/update-route.dto';

export interface IRoutesService {
  create(dto: CreateRouteDto): Promise<Route>;
  findAll(): Promise<Route[]>;
  findOne(id: number): Promise<Route>;
  update(id: number, dto: UpdateRouteDto): Promise<Route>;
  remove(id: number): Promise<Route>;
}
