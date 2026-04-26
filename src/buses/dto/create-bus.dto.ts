import { IsString, IsNotEmpty, MinLength, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBusDto {
  @ApiProperty({ example: 'BUS001', description: 'Bus code identifier' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  code: string;

  @ApiProperty({ example: 40, description: 'Bus passenger capacity', minimum: 1 })
  @IsInt()
  @Min(1)
  capacity: number;
}
