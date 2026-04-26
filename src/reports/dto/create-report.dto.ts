import { IsNumber, Min, IsInt, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReportDto {
  @ApiProperty({ example: 25, description: 'Current passenger count', minimum: 0 })
  @IsNumber()
  @Min(0)
  passenger_count: number;

  @ApiProperty({ example: 1, description: 'Route ID', required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  route_id?: number;

  @ApiProperty({ example: 1, description: 'Stop ID', required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  stop_id?: number;
}