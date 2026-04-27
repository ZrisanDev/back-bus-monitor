import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Bus } from '../src/buses/entities/bus.entity';
import { Report } from '../src/reports/entities/report.entity';
import { Route } from '../src/routes/entities/route.entity';
import { Stop } from '../src/stops/entities/stop.entity';
import { RouteStop } from '../src/route-stops/entities/route-stop.entity';
import { BusAssignment } from '../src/bus-assignments/entities/bus-assignment.entity';
import { CreateBuses1700000000000 } from '../src/database/migrations/001_create_buses';
import { CreateReports1700000001000 } from '../src/database/migrations/002_create_reports';
import { CreateDirections1700000002000 } from '../src/database/migrations/003_create_directions';
import { CreateRoutes1700000003000 } from '../src/database/migrations/004_create_routes';
import { CreateStops1700000004000 } from '../src/database/migrations/005_create_stops';
import { CreateRouteStops1700000006000 } from '../src/database/migrations/007_create_route_stops';
import { CreateBusAssignments1700000009000 } from '../src/database/migrations/010_create_bus_assignments';
import { AddRouteStopToReports1700000011000 } from '../src/database/migrations/011_add_route_stop_to_reports';
import { EnforceReportRouteStopNotNull1700000012000 } from '../src/database/migrations/012_enforce_report_route_stop_not_null';
import { AddLatLngToReports1700000013000 } from '../src/database/migrations/013_add_lat_lng_to_reports';
import { ReconcileReportsGeoConstraints1700000014000 } from '../src/database/migrations/014_reconcile_reports_geo_constraints';
import { AddSegmentGeometry1700000015000 } from '../src/database/migrations/015_add_segment_geometry';
import { AddTelemetryStatusColumns1700000016000 } from '../src/database/migrations/016_add_telemetry_status_columns';
import { DropDirectionFromRouteStops1700000017000 } from '../src/database/migrations/017_drop_direction_from_route_stops';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'bus_monitor',
  synchronize: false,
  entities: [Bus, Report, Route, Stop, RouteStop, BusAssignment],
  migrations: [
    CreateBuses1700000000000,
    CreateReports1700000001000,
    CreateDirections1700000002000,
    CreateRoutes1700000003000,
    CreateStops1700000004000,
    CreateRouteStops1700000006000,
    CreateBusAssignments1700000009000,
    AddRouteStopToReports1700000011000,
    EnforceReportRouteStopNotNull1700000012000,
    AddLatLngToReports1700000013000,
    ReconcileReportsGeoConstraints1700000014000,
    AddSegmentGeometry1700000015000,
    AddTelemetryStatusColumns1700000016000,
    DropDirectionFromRouteStops1700000017000,
  ],
  migrationsTableName: 'migrations',
});

async function runMigrations() {
  await dataSource.initialize();
  console.log('📡 Connected to PostgreSQL');
  
  try {
    // Get migrations to run
    const migrationNames = dataSource.migrations.map(m => m.name);
    console.log(`📋 ${migrationNames.length} migrations loaded:`);
    migrationNames.forEach(m => console.log(`  - ${m}`));
    
    // Run migrations
    const applied = await dataSource.runMigrations();
    console.log(`\n✅ Ran ${applied.length} migrations`);
    
    if (applied.length > 0) {
      applied.forEach(m => console.log(`  - ${m.name}`));
    }
    
    // Show current tables
    const tables = await dataSource.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    console.log('\n📋 Tables created:');
    tables.forEach((t: any) => console.log(`  - ${t.tablename}`));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await dataSource.destroy();
  }
}

runMigrations();