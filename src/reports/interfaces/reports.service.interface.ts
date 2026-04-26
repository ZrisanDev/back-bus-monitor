import { CreateReportDto } from '../dto/create-report.dto';
import { Report } from '../entities/report.entity';

export interface IReportsService {
  create(busId: number, dto: CreateReportDto): Promise<Report>;
  findAllByBus(busId: number): Promise<Report[]>;
  getLastStatusAll(filter?: string): Promise<any[]>;
  getBackfillPreview(): Promise<any>;
  executeBackfill(): Promise<any>;
  findReportsByBus(
    busId: number,
    page: number,
    limit: number,
    from?: string,
    to?: string,
  ): Promise<any>;
}
