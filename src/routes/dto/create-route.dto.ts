import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRouteDto {
  @ApiProperty({ example: 'Línea 1', description: 'Route name (unique)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'Main route through downtown', description: 'Route description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
