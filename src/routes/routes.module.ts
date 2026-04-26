import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Route } from './entities/route.entity';
import { RouteStop } from '../route-stops/entities/route-stop.entity';
import { RoutesService } from './routes.service';
import { RoutesController } from './routes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Route, RouteStop])],
  controllers: [RoutesController],
  providers: [
    RoutesService,
    { provide: 'IRoutesService', useExisting: RoutesService },
  ],
  exports: [RoutesService, 'IRoutesService'],
})
export class RoutesModule {}
