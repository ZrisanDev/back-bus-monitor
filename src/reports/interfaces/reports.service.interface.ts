import { CreateReportDto } from '../dto/create-report.dto';
import { Report } from '../entities/report.entity';

export interface IReportsService {
  create(busId: number, dto: CreateReportDto): Promise<Report>;
  findAllByBus(busId: number): Promise<Report[]>;
  getLastStatusAll(): Promise<any[]>;
  getBackfillPreview(): Promise<any>;
  executeBackfill(): Promise<any>;
}
