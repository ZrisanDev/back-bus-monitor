import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bus } from './entities/bus.entity';
import { CreateBusDto } from './dto/create-bus.dto';

@Injectable()
export class BusesService {
  constructor(
    @InjectRepository(Bus)
    private readonly busRepository: Repository<Bus>,
  ) {}

  async findByCode(code: string): Promise<Bus | null> {
    return this.busRepository.findOneBy({ code });
  }

  async create(dto: CreateBusDto): Promise<Bus> {
    const existing = await this.findByCode(dto.code);
    if (existing) {
      throw new ConflictException(
        `Ya existe un bus con el código "${dto.code}"`,
      );
    }

    const bus = this.busRepository.create(dto);
    return this.busRepository.save(bus);
  }

  async findAll(): Promise<Bus[]> {
    return this.busRepository.find();
  }

  async findOne(id: number): Promise<Bus> {
    const bus = await this.busRepository.findOneBy({ id });
    if (!bus) {
      throw new NotFoundException(`Bus con ID ${id} no encontrado`);
    }
    return bus;
  }
}
