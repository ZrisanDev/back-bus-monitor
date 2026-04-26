import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRouteStopDto {
  @ApiProperty({ example: 1, description: 'Route ID' })
  @IsInt()
  @Min(1)
  route_id: number;

  @ApiProperty({ example: 2, description: 'Stop ID' })
  @IsInt()
  @Min(1)
  stop_id: number;

  @ApiProperty({ example: 3, description: 'Direction ID' })
  @IsInt()
  @Min(1)
  direction_id: number;

  @ApiProperty({ example: 1, description: 'Stop order (positive integer, sequential per route+direction)' })
  @IsInt()
  @Min(1)
  stop_order: number;
}
