import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateDayTypeDto } from './dto/create-day-type.dto';
import { UpdateDayTypeDto } from './dto/update-day-type.dto';

@ApiTags('day-types')
@Controller('day-types')
export class DayTypesController {
  constructor(
    @Inject('IDayTypesService') private readonly dayTypesService: any,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new day type' })
  @ApiResponse({ status: 201, description: 'Day type created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Code already exists' })
  create(@Body() dto: CreateDayTypeDto) {
    return this.dayTypesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all day types' })
  @ApiResponse({ status: 200, description: 'List of day types' })
  findAll() {
    return this.dayTypesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a day type by id' })
  @ApiResponse({ status: 200, description: 'Day type found' })
  @ApiResponse({ status: 404, description: 'Day type not found' })
  findOne(@Param('id') id: string) {
    return this.dayTypesService.findOne(Number(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a day type' })
  @ApiResponse({ status: 200, description: 'Day type updated' })
  @ApiResponse({ status: 404, description: 'Day type not found' })
  @ApiResponse({ status: 409, description: 'Code already exists' })
  update(@Param('id') id: string, @Body() dto: UpdateDayTypeDto) {
    return this.dayTypesService.update(Number(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a day type' })
  @ApiResponse({ status: 200, description: 'Day type deleted' })
  @ApiResponse({ status: 404, description: 'Day type not found' })
  remove(@Param('id') id: string) {
    return this.dayTypesService.remove(Number(id));
  }
}
