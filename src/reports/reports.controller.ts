import { Controller, Get, Post, Body, Param, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CreateReportDto } from './dto/create-report.dto';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(
    @Inject('IReportsService') private readonly reportsService: any,
  ) {}

  // ⚠️ MUST be declared before routes with :id to avoid "status" matching as :id
  @Get('buses/status')
  @ApiOperation({ summary: 'Get last status of all buses' })
  @ApiResponse({ status: 200, description: 'Last status of all buses' })
  getLastStatusAll() {
    return this.reportsService.getLastStatusAll();
  }

  @Get('backfill-preview')
  @ApiOperation({ summary: 'Preview reports that need route_id/stop_id backfill' })
  @ApiResponse({ status: 200, description: 'Backfill preview summary' })
  getBackfillPreview() {
    return this.reportsService.getBackfillPreview();
  }

  @Post('backfill-execute')
  @ApiOperation({ summary: 'Execute backfill of route_id/stop_id for reports' })
  @ApiResponse({ status: 200, description: 'Backfill execution result' })
  executeBackfill() {
    return this.reportsService.executeBackfill();
  }

  @Post(':id/reports')
  @ApiOperation({ summary: 'Create a report for a bus' })
  @ApiParam({ name: 'id', description: 'Bus ID', type: Number })
  @ApiResponse({ status: 201, description: 'Report created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Bus not found' })
  create(@Param('id') id: string, @Body() dto: CreateReportDto) {
    return this.reportsService.create(Number(id), dto);
  }
}
