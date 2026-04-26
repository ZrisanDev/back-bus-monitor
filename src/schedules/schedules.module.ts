import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schedule } from './entities/schedule.entity';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { ScheduleLookupService } from './services/schedule-lookup.service';

@Module({
  imports: [TypeOrmModule.forFeature([Schedule])],
  controllers: [SchedulesController],
  providers: [
    SchedulesService,
    ScheduleLookupService,
    { provide: 'ISchedulesService', useExisting: SchedulesService },
  ],
  exports: [SchedulesService, 'ISchedulesService'],
})
export class SchedulesModule {}
