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
import { CreateRouteStopDto } from './dto/create-route-stop.dto';
import { UpdateRouteStopDto } from './dto/update-route-stop.dto';

@ApiTags('route-stops')
@Controller('route-stops')
export class RouteStopsController {
  constructor(
    @Inject('IRouteStopsService') private readonly routeStopsService: any,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new route stop' })
  @ApiResponse({ status: 201, description: 'Route stop created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Combination already exists' })
  create(@Body() dto: CreateRouteStopDto) {
    return this.routeStopsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all route stops' })
  @ApiResponse({ status: 200, description: 'List of route stops' })
  findAll() {
    return this.routeStopsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a route stop by id' })
  @ApiResponse({ status: 200, description: 'Route stop found' })
  @ApiResponse({ status: 404, description: 'Route stop not found' })
  findOne(@Param('id') id: string) {
    return this.routeStopsService.findOne(Number(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a route stop' })
  @ApiResponse({ status: 200, description: 'Route stop updated' })
  @ApiResponse({ status: 404, description: 'Route stop not found' })
  @ApiResponse({ status: 409, description: 'Combination already exists' })
  update(@Param('id') id: string, @Body() dto: UpdateRouteStopDto) {
    return this.routeStopsService.update(Number(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a route stop' })
  @ApiResponse({ status: 200, description: 'Route stop deleted' })
  @ApiResponse({ status: 404, description: 'Route stop not found' })
  remove(@Param('id') id: string) {
    return this.routeStopsService.remove(Number(id));
  }
}
