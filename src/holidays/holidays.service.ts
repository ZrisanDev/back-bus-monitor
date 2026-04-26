import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Holiday } from './entities/holiday.entity';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { IHolidaysService } from './interfaces/holidays.service.interface';

@Injectable()
export class HolidaysService implements IHolidaysService {
  constructor(
    @InjectRepository(Holiday)
    private readonly holidayRepository: Repository<Holiday>,
  ) {}

  async create(dto: CreateHolidayDto): Promise<Holiday> {
    const existing = await this.holidayRepository.findOneBy({ date: dto.date });
    if (existing) {
      throw new ConflictException(
        `Ya existe un feriado con la fecha "${dto.date}"`,
      );
    }

    const holiday = this.holidayRepository.create(dto);
    return this.holidayRepository.save(holiday);
  }

  async findAll(): Promise<Holiday[]> {
    return this.holidayRepository.find();
  }

  async findOne(id: number): Promise<Holiday> {
    const holiday = await this.holidayRepository.findOneBy({ id });
    if (!holiday) {
      throw new NotFoundException(`Feriado con ID ${id} no encontrado`);
    }
    return holiday;
  }

  async update(id: number, dto: UpdateHolidayDto): Promise<Holiday> {
    const holiday = await this.findOne(id);

    if (dto.date && dto.date !== holiday.date) {
      const existing = await this.holidayRepository.findOneBy({ date: dto.date });
      if (existing) {
        throw new ConflictException(
          `Ya existe un feriado con la fecha "${dto.date}"`,
        );
      }
    }

    Object.assign(holiday, dto);
    return this.holidayRepository.save(holiday);
  }

  async remove(id: number): Promise<Holiday> {
    const holiday = await this.findOne(id);
    return this.holidayRepository.remove(holiday);
  }
}
