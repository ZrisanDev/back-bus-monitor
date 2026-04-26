import { IsString, IsNotEmpty, MaxLength, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateHolidayDto {
  @ApiProperty({ example: '2026-12-25', description: 'Holiday date (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: 'Navidad', description: 'Holiday description' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description: string;
}
