import {
  IsNumber,
  Min,
  Max,
  IsInt,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReportDto {
  @ApiProperty({ example: 25, description: 'Current passenger count', minimum: 0 })
  @IsNumber()
  @Min(0)
  passenger_count: number;

  @ApiProperty({ example: -12.1294423, description: 'Latitude of the report' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: -77.0228339, description: 'Longitude of the report' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

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