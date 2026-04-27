import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Bus } from '../src/buses/entities/bus.entity';
import { Report } from '../src/reports/entities/report.entity';
import { Route } from '../src/routes/entities/route.entity';
import { Stop } from '../src/stops/entities/stop.entity';
import { RouteStop } from '../src/route-stops/entities/route-stop.entity';
import { BusAssignment } from '../src/bus-assignments/entities/bus-assignment.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'bus_monitor',
  entities: [Bus, Report, Route, Stop, RouteStop, BusAssignment],
});

async function truncate() {
  await dataSource.initialize();
  console.log('📡 Connected to PostgreSQL');
  
  const tables = ['route_stops', 'reports', 'bus_assignments', 'routes', 'stops', 'buses'];
  
  for (const table of tables) {
    await dataSource.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
    console.log(`🗑️  Truncated ${table}`);
  }
  
  // Keep directions
  await dataSource.query(`TRUNCATE TABLE directions RESTART IDENTITY CASCADE`);
  await dataSource.query(`INSERT INTO directions (name, code) VALUES ('Ida', 'IDA'), ('Vuelta', 'RET')`);
  console.log(`🔄 Reset directions`);
  
  console.log('\n✅ Database truncated');
  await dataSource.destroy();
}

truncate();