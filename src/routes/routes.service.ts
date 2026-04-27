import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Route } from './entities/route.entity';
import { RouteStop } from '../route-stops/entities/route-stop.entity';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { IRoutesService } from './interfaces/routes.service.interface';

@Injectable()
export class RoutesService implements IRoutesService {
  constructor(
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
    @InjectRepository(RouteStop)
    private readonly routeStopRepository: Repository<RouteStop>,
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

  async findStopsByRoute(routeId: number): Promise<any[]> {
    const route = await this.routeRepository.findOneBy({ id: routeId });
    if (!route) {
      throw new NotFoundException(`Ruta con ID ${routeId} no encontrada`);
    }

    const routeStops = await this.routeStopRepository.find({
      where: { route_id: routeId },
      relations: ['stop'],
      order: { stop_order: 'ASC' },
    });

    return routeStops.map((rs: any) => ({
      id: rs.stop.id,
      name: rs.stop.name,
      latitude: rs.stop.latitude,
      longitude: rs.stop.longitude,
      stop_order: rs.stop_order,
    }));
  }

  async findGeoJsonByRoute(routeId: number): Promise<any> {
    const route = await this.routeRepository.findOneBy({ id: routeId });
    if (!route) {
      throw new NotFoundException(`Ruta con ID ${routeId} no encontrada`);
    }

    const routeStops = await this.routeStopRepository.find({
      where: { route_id: routeId },
      relations: ['stop'],
      order: { stop_order: 'ASC' },
    });

    const features: any[] = [];

    // LineString feature from concatenated segment geometries
    const segmentsWithGeometry = routeStops.filter(
      (rs: any) => rs.segment_geometry !== null,
    );

    if (segmentsWithGeometry.length > 0) {
      const concatenatedCoords: number[][] = [];
      for (const rs of segmentsWithGeometry) {
        const coords: number[][] = rs.segment_geometry!.coordinates;
        if (concatenatedCoords.length === 0) {
          concatenatedCoords.push(...coords);
        } else {
          // Deduplicate junction point (last of previous == first of current)
          const lastCoord = concatenatedCoords[concatenatedCoords.length - 1];
          const firstCoord = coords[0];
          if (
            lastCoord[0] === firstCoord[0] &&
            lastCoord[1] === firstCoord[1]
          ) {
            concatenatedCoords.push(...coords.slice(1));
          } else {
            concatenatedCoords.push(...coords);
          }
        }
      }

      features.push({
        type: 'Feature',
        properties: {
          route_id: route.id,
          route_name: route.name,
        },
        geometry: {
          type: 'LineString',
          coordinates: concatenatedCoords,
        },
      });
    }

    // Point features for each stop
    for (const rs of routeStops) {
      features.push({
        type: 'Feature',
        properties: {
          stop_id: rs.stop.id,
          stop_name: rs.stop.name,
          order: rs.stop_order,
        },
        geometry: {
          type: 'Point',
          coordinates: [Number(rs.stop.longitude), Number(rs.stop.latitude)],
        },
      });
    }

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  async findSegmentByOrder(routeId: number, order: number): Promise<any> {
    const route = await this.routeRepository.findOneBy({ id: routeId });
    if (!route) {
      throw new NotFoundException(`Ruta con ID ${routeId} no encontrada`);
    }

    const routeStops = await this.routeStopRepository.find({
      where: { route_id: routeId },
      relations: ['stop'],
      order: { stop_order: 'ASC' },
    });

    const targetStop = routeStops.find((rs: any) => rs.stop_order === order);
    if (!targetStop) {
      throw new NotFoundException(
        `Stop order ${order} no encontrado para la ruta ${routeId}`,
      );
    }

    if (!targetStop.segment_geometry) {
      throw new NotFoundException(
        `Segment geometry no disponible para stop order ${order} en ruta ${routeId}`,
      );
    }

    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: targetStop.segment_geometry.coordinates,
      },
      properties: {
        route_id: route.id,
        route_name: route.name,
        stop_id: targetStop.stop.id,
        stop_name: targetStop.stop.name,
        order: targetStop.stop_order,
      },
    };
  }
}
