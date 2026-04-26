import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stop } from './entities/stop.entity';
import { CreateStopDto } from './dto/create-stop.dto';
import { UpdateStopDto } from './dto/update-stop.dto';
import { IStopsService } from './interfaces/stops.service.interface';

@Injectable()
export class StopsService implements IStopsService {
  constructor(
    @InjectRepository(Stop)
    private readonly stopRepository: Repository<Stop>,
  ) {}

  async create(dto: CreateStopDto): Promise<Stop> {
    const existing = await this.stopRepository.findOneBy({ name: dto.name });
    if (existing) {
      throw new ConflictException(
        `Ya existe una parada con el nombre "${dto.name}"`,
      );
    }

    const stop = this.stopRepository.create(dto);
    return this.stopRepository.save(stop);
  }

  async findAll(): Promise<Stop[]> {
    return this.stopRepository.find();
  }

  async findOne(id: number): Promise<Stop> {
    const stop = await this.stopRepository.findOneBy({ id });
    if (!stop) {
      throw new NotFoundException(`Parada con ID ${id} no encontrada`);
    }
    return stop;
  }

  async update(id: number, dto: UpdateStopDto): Promise<Stop> {
    const stop = await this.findOne(id);

    if (dto.name && dto.name !== stop.name) {
      const existing = await this.stopRepository.findOneBy({ name: dto.name });
      if (existing) {
        throw new ConflictException(
          `Ya existe una parada con el nombre "${dto.name}"`,
        );
      }
    }

    Object.assign(stop, dto);
    return this.stopRepository.save(stop);
  }

  async remove(id: number): Promise<Stop> {
    const stop = await this.findOne(id);
    return this.stopRepository.remove(stop);
  }
}
