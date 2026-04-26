import { UnprocessableEntityException } from '@nestjs/common';
import { ICapacityValidator } from './capacity.validator.interface';
import { CreateReportDto } from '../../reports/dto/create-report.dto';
import { Bus } from '../entities/bus.entity';

export class MaxPassengersValidator implements ICapacityValidator {
  validate(dto: CreateReportDto, bus: Bus): void {
    if (dto.passenger_count > bus.capacity) {
      throw new UnprocessableEntityException(
        `La cantidad de pasajeros (${dto.passenger_count}) excede la capacidad del bus (${bus.capacity})`,
      );
    }
  }
}
