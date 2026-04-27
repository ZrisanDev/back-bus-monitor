import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RouteStop } from './entities/route-stop.entity';
import { CreateRouteStopDto } from './dto/create-route-stop.dto';
import { UpdateRouteStopDto } from './dto/update-route-stop.dto';
import { IRouteStopsService } from './interfaces/route-stops.service.interface';

@Injectable()
export class RouteStopsService implements IRouteStopsService {
  constructor(
    @InjectRepository(RouteStop)
    private readonly routeStopRepository: Repository<RouteStop>,
  ) {}

  async create(dto: CreateRouteStopDto): Promise<RouteStop> {
    // Check UNIQUE(route_id, stop_id)
    const existingCombination = await this.routeStopRepository.findOneBy({
      route_id: dto.route_id,
      stop_id: dto.stop_id,
    });
    if (existingCombination) {
      throw new ConflictException(
        `Ya existe la combinación de ruta ${dto.route_id} y parada ${dto.stop_id}`,
      );
    }

    // Check UNIQUE(route_id, stop_order)
    const existingOrder = await this.routeStopRepository.findOneBy({
      route_id: dto.route_id,
      stop_order: dto.stop_order,
    });
    if (existingOrder) {
      throw new ConflictException(
        `Ya existe una parada con orden ${dto.stop_order} para la ruta ${dto.route_id}`,
      );
    }

    const routeStop = this.routeStopRepository.create(dto);
    return this.routeStopRepository.save(routeStop);
  }

  async findAll(): Promise<RouteStop[]> {
    return this.routeStopRepository.find();
  }

  async findOne(id: number): Promise<RouteStop> {
    const routeStop = await this.routeStopRepository.findOneBy({ id });
    if (!routeStop) {
      throw new NotFoundException(`Parada de ruta con ID ${id} no encontrada`);
    }
    return routeStop;
  }

  async update(id: number, dto: UpdateRouteStopDto): Promise<RouteStop> {
    const routeStop = await this.findOne(id);

    Object.assign(routeStop, dto);
    return this.routeStopRepository.save(routeStop);
  }

  async remove(id: number): Promise<RouteStop> {
    const routeStop = await this.findOne(id);
    return this.routeStopRepository.remove(routeStop);
  }
}
