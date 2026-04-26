import { CreateReportDto } from '../../reports/dto/create-report.dto';
import { Bus } from '../entities/bus.entity';

export interface ICapacityValidator {
  validate(dto: CreateReportDto, bus: Bus): Promise<void> | void;
}
