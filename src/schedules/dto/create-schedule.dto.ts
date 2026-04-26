import { IsInt, Min, IsMilitaryTime, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateScheduleDto {
  @ApiProperty({ example: 1, description: 'Route ID' })
  @IsInt()
  @Min(1)
  route_id: number;

  @ApiProperty({ example: 2, description: 'Direction ID' })
  @IsInt()
  @Min(1)
  direction_id: number;

  @ApiProperty({ example: 3, description: 'Day type ID' })
  @IsInt()
  @Min(1)
  day_type_id: number;

  @ApiProperty({ example: '06:00', description: 'Start time (HH:MM)', required: false })
  @IsOptional()
  @IsMilitaryTime()
  start_time?: string;

  @ApiProperty({ example: '22:00', description: 'End time (HH:MM)', required: false })
  @IsOptional()
  @IsMilitaryTime()
  end_time?: string;

  @ApiProperty({ example: true, description: 'Whether the schedule is operating', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  is_operating?: boolean;
}
