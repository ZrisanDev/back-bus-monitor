import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bus } from './entities/bus.entity';
import { BusesService } from './buses.service';
import { BusesController } from './buses.controller';
import { MaxPassengersValidator } from './validators/max-passengers.validator';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [TypeOrmModule.forFeature([Bus]), forwardRef(() => ReportsModule)],
  controllers: [BusesController],
  providers: [
    BusesService,
    { provide: 'IBusesService', useExisting: BusesService },
    { provide: 'IBusReader', useExisting: BusesService },
    { provide: 'ICapacityValidator', useClass: MaxPassengersValidator },
  ],
  exports: [BusesService, 'IBusesService', 'IBusReader', 'ICapacityValidator'],
})
export class BusesModule {}
