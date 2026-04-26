import { Controller, Get, Post, Body, Param, Query, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CreateBusDto } from './dto/create-bus.dto';

@ApiTags('buses')
@Controller('buses')
export class BusesController {
  constructor(
    @Inject('IBusesService') private readonly busesService: any,
    @Inject(forwardRef(() => 'IReportsService'))
    private readonly reportsService: any,
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

  @Get(':id/reports')
  @ApiOperation({ summary: 'Get historical reports for a bus' })
  @ApiParam({ name: 'id', description: 'Bus ID', type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated reports' })
  @ApiResponse({ status: 404, description: 'Bus not found' })
  findReportsByBus(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.findReportsByBus(
      Number(id),
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      from,
      to,
    );
  }
}
