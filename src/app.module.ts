import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { BusesModule } from './buses/buses.module';
import { ReportsModule } from './reports/reports.module';
import { RoutesModule } from './routes/routes.module';
import { StopsModule } from './stops/stops.module';
import { RouteStopsModule } from './route-stops/route-stops.module';
import { BusAssignmentsModule } from './bus-assignments/bus-assignments.module';
import { SimulatorModule } from './simulator/simulator.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule.forRoot(),
    HealthModule,
    BusesModule,
    ReportsModule,
    RoutesModule,
    StopsModule,
    RouteStopsModule,
    BusAssignmentsModule,
    SimulatorModule,
  ],
})
export class AppModule {}
