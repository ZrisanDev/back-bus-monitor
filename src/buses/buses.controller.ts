import { Controller, Get, Post, Body } from '@nestjs/common';
import { BusesService } from './buses.service';
import { CreateBusDto } from './dto/create-bus.dto';

@Controller('buses')
export class BusesController {
  constructor(private readonly busesService: BusesService) {}

  @Post()
  create(@Body() dto: CreateBusDto) {
    return this.busesService.create(dto);
  }

  @Get()
  findAll() {
    return this.busesService.findAll();
  }
}
