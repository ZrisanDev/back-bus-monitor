import { IsString, IsNotEmpty, Length, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDirectionDto {
  @ApiProperty({ example: 'NORTE_SUR', description: 'Unique direction code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  code: string;

  @ApiProperty({ example: 'Norte → Sur', description: 'Spanish label' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  label_es: string;

  @ApiProperty({ example: 'North → South', description: 'English label' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  label_en: string;
}
