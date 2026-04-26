import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDayTypeDto {
  @ApiProperty({ example: 'LUNES_VIERNES', description: 'Unique day type code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  code: string;

  @ApiProperty({ example: 'Lunes a Viernes', description: 'Spanish label' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  label_es: string;

  @ApiProperty({ example: 'Monday to Friday', description: 'English label' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  label_en: string;
}
