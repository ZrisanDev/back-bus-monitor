import { PartialType } from '@nestjs/swagger';
import { CreateBusAssignmentDto } from './create-bus-assignment.dto';

export class UpdateBusAssignmentDto extends PartialType(CreateBusAssignmentDto) {}
