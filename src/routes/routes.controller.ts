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
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';

@ApiTags('routes')
@Controller('routes')
export class RoutesController {
  constructor(
    @Inject('IRoutesService') private readonly routesService: any,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new route' })
  @ApiResponse({ status: 201, description: 'Route created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Name already exists' })
  create(@Body() dto: CreateRouteDto) {
    return this.routesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all routes' })
  @ApiResponse({ status: 200, description: 'List of routes' })
  findAll() {
    return this.routesService.findAll();
  }

  @Get(':id/stops')
  @ApiOperation({ summary: 'Get ordered stops for a route' })
  @ApiParam({ name: 'id', description: 'Route ID', type: Number })
  @ApiResponse({ status: 200, description: 'Ordered stops' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  findStopsByRoute(@Param('id') id: string) {
    return this.routesService.findStopsByRoute(Number(id));
  }

  @Get(':id/geojson')
  @ApiOperation({ summary: 'Get GeoJSON for a route' })
  @ApiParam({ name: 'id', description: 'Route ID', type: Number })
  @ApiResponse({ status: 200, description: 'GeoJSON FeatureCollection' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  findGeoJsonByRoute(@Param('id') id: string) {
    return this.routesService.findGeoJsonByRoute(Number(id));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a route by id' })
  @ApiResponse({ status: 200, description: 'Route found' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  findOne(@Param('id') id: string) {
    return this.routesService.findOne(Number(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a route' })
  @ApiResponse({ status: 200, description: 'Route updated' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  @ApiResponse({ status: 409, description: 'Name already exists' })
  update(@Param('id') id: string, @Body() dto: UpdateRouteDto) {
    return this.routesService.update(Number(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a route' })
  @ApiResponse({ status: 200, description: 'Route deleted' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  remove(@Param('id') id: string) {
    return this.routesService.remove(Number(id));
  }
}
