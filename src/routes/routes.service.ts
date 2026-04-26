import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Route } from './entities/route.entity';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { IRoutesService } from './interfaces/routes.service.interface';

@Injectable()
export class RoutesService implements IRoutesService {
  constructor(
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
  ) {}

  async create(dto: CreateRouteDto): Promise<Route> {
    const existing = await this.routeRepository.findOneBy({ name: dto.name });
    if (existing) {
      throw new ConflictException(
        `Ya existe una ruta con el nombre "${dto.name}"`,
      );
    }

    const route = this.routeRepository.create(dto);
    return this.routeRepository.save(route);
  }

  async findAll(): Promise<Route[]> {
    return this.routeRepository.find();
  }

  async findOne(id: number): Promise<Route> {
    const route = await this.routeRepository.findOneBy({ id });
    if (!route) {
      throw new NotFoundException(`Ruta con ID ${id} no encontrada`);
    }
    return route;
  }

  async update(id: number, dto: UpdateRouteDto): Promise<Route> {
    const route = await this.findOne(id);

    if (dto.name && dto.name !== route.name) {
      const existing = await this.routeRepository.findOneBy({ name: dto.name });
      if (existing) {
        throw new ConflictException(
          `Ya existe una ruta con el nombre "${dto.name}"`,
        );
      }
    }

    Object.assign(route, dto);
    return this.routeRepository.save(route);
  }

  async remove(id: number): Promise<Route> {
    const route = await this.findOne(id);
    return this.routeRepository.remove(route);
  }
}
