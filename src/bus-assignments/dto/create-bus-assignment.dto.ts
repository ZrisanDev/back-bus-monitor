import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBusAssignmentDto {
  @ApiProperty({ example: 1, description: 'Bus ID' })
  @IsInt()
  @Min(1)
  bus_id: number;

  @ApiProperty({ example: 1, description: 'Route ID' })
  @IsInt()
  @Min(1)
  route_id: number;
}
