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
import { CreateStopDto } from './dto/create-stop.dto';
import { UpdateStopDto } from './dto/update-stop.dto';

@ApiTags('stops')
@Controller('stops')
export class StopsController {
  constructor(
    @Inject('IStopsService') private readonly stopsService: any,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new stop' })
  @ApiResponse({ status: 201, description: 'Stop created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Name already exists' })
  create(@Body() dto: CreateStopDto) {
    return this.stopsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all stops' })
  @ApiResponse({ status: 200, description: 'List of stops' })
  findAll() {
    return this.stopsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a stop by id' })
  @ApiResponse({ status: 200, description: 'Stop found' })
  @ApiResponse({ status: 404, description: 'Stop not found' })
  findOne(@Param('id') id: string) {
    return this.stopsService.findOne(Number(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a stop' })
  @ApiResponse({ status: 200, description: 'Stop updated' })
  @ApiResponse({ status: 404, description: 'Stop not found' })
  @ApiResponse({ status: 409, description: 'Name already exists' })
  update(@Param('id') id: string, @Body() dto: UpdateStopDto) {
    return this.stopsService.update(Number(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a stop' })
  @ApiResponse({ status: 200, description: 'Stop deleted' })
  @ApiResponse({ status: 404, description: 'Stop not found' })
  remove(@Param('id') id: string) {
    return this.stopsService.remove(Number(id));
  }
}
