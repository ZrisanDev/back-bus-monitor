import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RouteStop } from './entities/route-stop.entity';
import { RouteStopsService } from './route-stops.service';
import { RouteStopsController } from './route-stops.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RouteStop])],
  controllers: [RouteStopsController],
  providers: [
    RouteStopsService,
    { provide: 'IRouteStopsService', useExisting: RouteStopsService },
  ],
  exports: [RouteStopsService, 'IRouteStopsService'],
})
export class RouteStopsModule {}
