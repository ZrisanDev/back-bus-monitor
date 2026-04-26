import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Direction } from './entities/direction.entity';
import { DirectionsService } from './directions.service';
import { DirectionsController } from './directions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Direction])],
  controllers: [DirectionsController],
  providers: [
    DirectionsService,
    { provide: 'IDirectionsService', useExisting: DirectionsService },
  ],
  exports: [DirectionsService, 'IDirectionsService'],
})
export class DirectionsModule {}
