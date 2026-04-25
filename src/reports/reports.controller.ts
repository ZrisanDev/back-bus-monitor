import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';

@Controller('buses')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ⚠️ MUST be declared before routes with :id to avoid "status" matching as :id
  @Get('status')
  getLastStatusAll() {
    return this.reportsService.getLastStatusAll();
  }

  @Post(':id/reports')
  create(@Param('id') id: string, @Body() dto: CreateReportDto) {
    return this.reportsService.create(Number(id), dto);
  }
}
