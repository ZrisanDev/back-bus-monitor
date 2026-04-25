import { IsNumber, Min, Max } from 'class-validator';

export class CreateReportDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsNumber()
  @Min(0)
  passenger_count: number;
}
