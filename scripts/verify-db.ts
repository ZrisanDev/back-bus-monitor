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
  synchronize: false,
  entities: [Bus, Report, Route, Stop, RouteStop, BusAssignment],
});

async function verify() {
  await dataSource.initialize();
  
  console.log('📊 Database state:\n');
  
  const routes = await dataSource.getRepository(Route).count();
  console.log(`  routes:    ${routes}`);
  
  const stops = await dataSource.getRepository(Stop).count();
  console.log(`  stops:    ${stops}`);
  
  const routeStops = await dataSource.getRepository(RouteStop).count();
  console.log(`  route_stops: ${routeStops}`);
  
  const buses = await dataSource.getRepository(Bus).count();
  console.log(`  buses:    ${buses}`);

  // Show first 5 routes
  const routeList = await dataSource.getRepository(Route).find({ take: 5 });
  console.log('\n📋 Sample routes:');
  routeList.forEach(r => console.log(`  - ${r.name}`));

  await dataSource.destroy();
}

verify();