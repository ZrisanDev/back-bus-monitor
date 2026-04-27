import { IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { GeoJsonLineString } from '../../common/types/geojson';

class GeoJsonLineStringDto implements GeoJsonLineString {
  @ApiProperty({ example: 'LineString' })
  type: 'LineString';

  @ApiProperty({
    example: [[-58.3816, -34.6037], [-58.382, -34.6045]],
    description: 'Array of [longitude, latitude] coordinate pairs',
  })
  coordinates: Array<[number, number]>;
}

export class CreateRouteStopDto {
  @ApiProperty({ example: 1, description: 'Route ID' })
  @IsInt()
  @Min(1)
  route_id: number;

  @ApiProperty({ example: 2, description: 'Stop ID' })
  @IsInt()
  @Min(1)
stop_id: number;

    @ApiProperty({ example: 1, description: 'Stop order (positive integer, sequential per route)' })
  @IsInt()
  @Min(1)
  stop_order: number;

  @ApiPropertyOptional({
    description: 'GeoJSON LineString geometry for the segment from this stop to the next',
    type: GeoJsonLineStringDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeoJsonLineStringDto)
  segment_geometry?: GeoJsonLineString | null;
}
