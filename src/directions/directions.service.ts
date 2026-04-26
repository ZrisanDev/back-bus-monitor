import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Direction } from './entities/direction.entity';
import { CreateDirectionDto } from './dto/create-direction.dto';
import { UpdateDirectionDto } from './dto/update-direction.dto';
import { IDirectionsService } from './interfaces/directions.service.interface';

@Injectable()
export class DirectionsService implements IDirectionsService {
  constructor(
    @InjectRepository(Direction)
    private readonly directionRepository: Repository<Direction>,
  ) {}

  async create(dto: CreateDirectionDto): Promise<Direction> {
    const existing = await this.directionRepository.findOneBy({ code: dto.code });
    if (existing) {
      throw new ConflictException(
        `Ya existe una dirección con el código "${dto.code}"`,
      );
    }

    const direction = this.directionRepository.create(dto);
    return this.directionRepository.save(direction);
  }

  async findAll(): Promise<Direction[]> {
    return this.directionRepository.find();
  }

  async findOne(id: number): Promise<Direction> {
    const direction = await this.directionRepository.findOneBy({ id });
    if (!direction) {
      throw new NotFoundException(`Dirección con ID ${id} no encontrada`);
    }
    return direction;
  }

  async update(id: number, dto: UpdateDirectionDto): Promise<Direction> {
    const direction = await this.findOne(id);

    if (dto.code && dto.code !== direction.code) {
      const existing = await this.directionRepository.findOneBy({ code: dto.code });
      if (existing) {
        throw new ConflictException(
          `Ya existe una dirección con el código "${dto.code}"`,
        );
      }
    }

    Object.assign(direction, dto);
    return this.directionRepository.save(direction);
  }

  async remove(id: number): Promise<Direction> {
    const direction = await this.findOne(id);
    return this.directionRepository.remove(direction);
  }
}
