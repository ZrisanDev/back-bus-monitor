import { RouteStop } from '../entities/route-stop.entity';
import { CreateRouteStopDto } from '../dto/create-route-stop.dto';
import { UpdateRouteStopDto } from '../dto/update-route-stop.dto';

export interface IRouteStopsService {
  create(dto: CreateRouteStopDto): Promise<RouteStop>;
  findAll(): Promise<RouteStop[]>;
  findOne(id: number): Promise<RouteStop>;
  update(id: number, dto: UpdateRouteStopDto): Promise<RouteStop>;
  remove(id: number): Promise<RouteStop>;
}
