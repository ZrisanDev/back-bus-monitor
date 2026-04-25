import { IsString, IsNotEmpty, MinLength, IsInt, Min } from 'class-validator';

export class CreateBusDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  code: string;

  @IsInt()
  @Min(1)
  capacity: number;
}
