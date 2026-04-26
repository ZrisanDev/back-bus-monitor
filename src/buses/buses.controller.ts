import { Controller, Get, Post, Body, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateBusDto } from './dto/create-bus.dto';

@ApiTags('buses')
@Controller('buses')
export class BusesController {
  constructor(
    @Inject('IBusesService') private readonly busesService: any,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new bus' })
  @ApiResponse({ status: 201, description: 'Bus created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() dto: CreateBusDto) {
    return this.busesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all buses' })
  @ApiResponse({ status: 200, description: 'List of buses' })
  findAll() {
    return this.busesService.findAll();
  }
}
