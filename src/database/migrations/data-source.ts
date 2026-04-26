import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Bus } from '../../buses/entities/bus.entity';
import { Report } from '../../reports/entities/report.entity';
import { Direction } from '../../directions/entities/direction.entity';
import { Route } from '../../routes/entities/route.entity';
import { Stop } from '../../stops/entities/stop.entity';
import { DayType } from '../../day-types/entities/day-type.entity';
import { RouteStop } from '../../route-stops/entities/route-stop.entity';
import { Holiday } from '../../holidays/entities/holiday.entity';
import { Schedule } from '../../schedules/entities/schedule.entity';
import { BusAssignment } from '../../bus-assignments/entities/bus-assignment.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'bus_monitor',
  synchronize: false,
  entities: [Bus, Report, Direction, Route, Stop, DayType, RouteStop, Holiday, Schedule, BusAssignment],
  migrations: [
    __dirname + '/001_create_buses.js',
    __dirname + '/002_create_reports.js',
    __dirname + '/003_create_directions.js',
    __dirname + '/004_create_routes.js',
    __dirname + '/005_create_stops.js',
    __dirname + '/006_create_day_types.js',
    __dirname + '/007_create_route_stops.js',
    __dirname + '/008_create_holidays.js',
    __dirname + '/009_create_schedules.js',
    __dirname + '/010_create_bus_assignments.js',
    __dirname + '/011_add_route_stop_to_reports.js',
    __dirname + '/012_enforce_report_route_stop_not_null.js',
  ],
});
