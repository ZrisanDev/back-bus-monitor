import { PartialType } from '@nestjs/swagger';
import { CreateDayTypeDto } from './create-day-type.dto';

export class UpdateDayTypeDto extends PartialType(CreateDayTypeDto) {}
