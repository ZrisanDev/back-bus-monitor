import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Bus } from '../src/buses/entities/bus.entity';
import { Report } from '../src/reports/entities/report.entity';
import { Route } from '../src/routes/entities/route.entity';
import { Stop } from '../src/stops/entities/stop.entity';
import { RouteStop } from '../src/route-stops/entities/route-stop.entity';
import {
  parseSeedData,
  computeRouteSeedActions,
  computeStopSeedActions,
  computeRouteStopSeedActions,
} from '../src/database/seeds/metropolitano.seed';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'bus_monitor',
  synchronize: false,
  entities: [Bus, Report, Route, Stop, RouteStop],
});

async function seed() {
  await dataSource.initialize();
  console.log('🌱 Loading full Metropolitano seed...');

  // Load full seed data
  const metropolitanoRaw = require('../data/metropolitano_seed_completo.json');
  const seedData = parseSeedData(metropolitanoRaw);

  console.log(`📋 Routes to seed: ${seedData.routes.length}`);
  console.log(`📋 Stops to seed: ${seedData.stops.length}`);
  console.log(`📋 RouteStops to seed: ${seedData.routeStops.length}\n`);

  const routeRepo = dataSource.getRepository(Route);
  const stopRepo = dataSource.getRepository(Stop);
  const routeStopRepo = dataSource.getRepository(RouteStop);

  // ── Routes ─────────────────────────────────────────────────────────
  const existingRoutes = await routeRepo.find({ select: ['name'] });
  const existingRouteNames = existingRoutes.map((r) => r.name);
  const routeActions = computeRouteSeedActions(existingRouteNames, seedData.routes);

  for (const route of routeActions.toInsert) {
    await routeRepo.save(routeRepo.create(route));
    console.log(`  ✅ Inserted route: ${route.name}`);
  }
  console.log(
    `📊 Routes: ${routeActions.toInsert.length} inserted, ${routeActions.skipped.length} skipped`,
  );

  // ── Stops ─────────────────────────────────────────────────────────
  // Filter stops with valid coordinates
  const stopsWithCoords = seedData.stops.filter(s => s.lat && s.lng);
  console.log(`📋 Stops with coords: ${stopsWithCoords.length}/${seedData.stops.length}`);
  
  const existingStops = await stopRepo.find({ select: ['name'] });
  const existingStopNames = existingStops.map((s) => s.name);
  const stopActions = computeStopSeedActions(existingStopNames, stopsWithCoords);

  for (const stop of stopActions.toInsert) {
    await stopRepo.save(stopRepo.create({
      name: stop.name,
      latitude: stop.lat,
      longitude: stop.lng,
    }));
    console.log(`  ✅ Inserted stop: ${stop.name}`);
  }
  console.log(
    `📊 Stops: ${stopActions.toInsert.length} inserted, ${stopActions.skipped.length} skipped`,
  );

  // ── Route Stops ────────────────────────────────────────────────────
  const existingRouteStops = await routeStopRepo
    .createQueryBuilder('rs')
    .innerJoin('rs.route', 'r')
    .innerJoin('rs.stop', 's')
    .select(['r.name', 'rs.stop_order'])
    .getRawMany();

  const existingCompositeKeys = existingRouteStops.map(
    (rs) => `${rs.rs_route_name}|${rs.rs_stop_order}`,
  );
  const routeStopActions = computeRouteStopSeedActions(existingCompositeKeys, seedData.routeStops);

  for (const rs of routeStopActions.toInsert) {
    const route = await routeRepo.findOne({ where: { name: rs.route_name } });
    const stop = await stopRepo.findOne({ where: { name: rs.stop_name } });
    if (route && stop) {
      await routeStopRepo.save(
        routeStopRepo.create({
          route,
          stop,
          stop_order: rs.stop_order,
        }),
      );
      console.log(
        `  ✅ Inserted route_stop: ${rs.route_name} #${rs.stop_order} ${rs.stop_name}`,
      );
    }
  }
  console.log(
    `📊 RouteStops: ${routeStopActions.toInsert.length} inserted, ${routeStopActions.skipped.length} skipped`,
  );

  console.log('\n👋 Full seed completed');
  await dataSource.destroy();
}

seed();