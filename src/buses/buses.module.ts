import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bus } from './entities/bus.entity';
import { BusesService } from './buses.service';
import { BusesController } from './buses.controller';
import { MaxPassengersValidator } from './validators/max-passengers.validator';

@Module({
  imports: [TypeOrmModule.forFeature([Bus])],
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
