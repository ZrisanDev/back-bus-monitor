import {
  IsNumber,
  Min,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
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

  @ApiProperty({ example: 'En camino a Plaza Mayor', description: 'Bus status text', required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ example: 'Parada Central', description: 'Current stop name', required: false })
  @IsString()
  @IsOptional()
  current_stop?: string;

  @ApiProperty({ example: 'Plaza Mayor', description: 'Next stop name', required: false, nullable: true })
  @IsString()
  @IsOptional()
  next_stop?: string | null;
}