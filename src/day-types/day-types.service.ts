import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DayType } from './entities/day-type.entity';
import { CreateDayTypeDto } from './dto/create-day-type.dto';
import { UpdateDayTypeDto } from './dto/update-day-type.dto';
import { IDayTypesService } from './interfaces/day-types.service.interface';

@Injectable()
export class DayTypesService implements IDayTypesService {
  constructor(
    @InjectRepository(DayType)
    private readonly dayTypeRepository: Repository<DayType>,
  ) {}

  async create(dto: CreateDayTypeDto): Promise<DayType> {
    const existing = await this.dayTypeRepository.findOneBy({ code: dto.code });
    if (existing) {
      throw new ConflictException(
        `Ya existe un tipo de día con el código "${dto.code}"`,
      );
    }

    const dayType = this.dayTypeRepository.create(dto);
    return this.dayTypeRepository.save(dayType);
  }

  async findAll(): Promise<DayType[]> {
    return this.dayTypeRepository.find();
  }

  async findOne(id: number): Promise<DayType> {
    const dayType = await this.dayTypeRepository.findOneBy({ id });
    if (!dayType) {
      throw new NotFoundException(`Tipo de día con ID ${id} no encontrado`);
    }
    return dayType;
  }

  async update(id: number, dto: UpdateDayTypeDto): Promise<DayType> {
    const dayType = await this.findOne(id);

    if (dto.code && dto.code !== dayType.code) {
      const existing = await this.dayTypeRepository.findOneBy({ code: dto.code });
      if (existing) {
        throw new ConflictException(
          `Ya existe un tipo de día con el código "${dto.code}"`,
        );
      }
    }

    Object.assign(dayType, dto);
    return this.dayTypeRepository.save(dayType);
  }

  async remove(id: number): Promise<DayType> {
    const dayType = await this.findOne(id);
    return this.dayTypeRepository.remove(dayType);
  }
}
