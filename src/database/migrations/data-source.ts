import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Bus } from '../../buses/entities/bus.entity';
import { Report } from '../../reports/entities/report.entity';
import { Route } from '../../routes/entities/route.entity';
import { Stop } from '../../stops/entities/stop.entity';
import { RouteStop } from '../../route-stops/entities/route-stop.entity';
import { BusAssignment } from '../../bus-assignments/entities/bus-assignment.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'bus_monitor',
  synchronize: false,
  entities: [Bus, Report, Route, Stop, RouteStop, BusAssignment],
  migrations: [
    __dirname + '/001_create_buses.js',
    __dirname + '/002_create_reports.js',
    __dirname + '/004_create_routes.js',
    __dirname + '/005_create_stops.js',
    __dirname + '/007_create_route_stops.js',
    __dirname + '/010_create_bus_assignments.js',
    __dirname + '/011_add_route_stop_to_reports.js',
    __dirname + '/012_enforce_report_route_stop_not_null.js',
    __dirname + '/013_add_lat_lng_to_reports.js',
    __dirname + '/014_reconcile_reports_geo_constraints.js',
    __dirname + '/015_add_segment_geometry.js',
    __dirname + '/016_add_telemetry_status_columns.js',
    __dirname + '/017_drop_direction_from_route_stops.js',
  ],
});
