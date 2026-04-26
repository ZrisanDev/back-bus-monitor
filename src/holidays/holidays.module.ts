import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Holiday } from './entities/holiday.entity';
import { HolidaysService } from './holidays.service';
import { HolidaysController } from './holidays.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Holiday])],
  controllers: [HolidaysController],
  providers: [
    HolidaysService,
    { provide: 'IHolidaysService', useExisting: HolidaysService },
  ],
  exports: [HolidaysService, 'IHolidaysService'],
})
export class HolidaysModule {}
