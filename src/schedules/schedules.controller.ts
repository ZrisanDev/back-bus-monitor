import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Inject,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@ApiTags('schedules')
@Controller('schedules')
export class SchedulesController {
  constructor(
    @Inject('ISchedulesService') private readonly schedulesService: any,
  ) {}

  @Get('lookup')
  @ApiOperation({ summary: 'Lookup schedule by date with holiday override' })
  @ApiQuery({ name: 'route_id', type: Number, description: 'Route ID' })
  @ApiQuery({ name: 'direction_id', type: Number, description: 'Direction ID' })
  @ApiQuery({ name: 'date', type: String, description: 'Date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Schedule lookup result' })
  lookup(
    @Query('route_id') routeId: string,
    @Query('direction_id') directionId: string,
    @Query('date') date: string,
  ) {
    return this.schedulesService.lookup(
      Number(routeId),
      Number(directionId),
      date,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a new schedule' })
  @ApiResponse({ status: 201, description: 'Schedule created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Schedule combination already exists' })
  @ApiResponse({ status: 422, description: 'Invalid time window' })
  create(@Body() dto: CreateScheduleDto) {
    return this.schedulesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all schedules' })
  @ApiResponse({ status: 200, description: 'List of schedules' })
  findAll() {
    return this.schedulesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a schedule by id' })
  @ApiResponse({ status: 200, description: 'Schedule found' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  findOne(@Param('id') id: string) {
    return this.schedulesService.findOne(Number(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a schedule' })
  @ApiResponse({ status: 200, description: 'Schedule updated' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  @ApiResponse({ status: 409, description: 'Schedule combination already exists' })
  @ApiResponse({ status: 422, description: 'Invalid time window' })
  update(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.schedulesService.update(Number(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a schedule' })
  @ApiResponse({ status: 200, description: 'Schedule deleted' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  remove(@Param('id') id: string) {
    return this.schedulesService.remove(Number(id));
  }
}
