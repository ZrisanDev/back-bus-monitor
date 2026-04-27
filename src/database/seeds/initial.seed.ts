import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Bus } from '../../buses/entities/bus.entity';
import { Report } from '../../reports/entities/report.entity';
import { Route } from '../../routes/entities/route.entity';
import { Stop } from '../../stops/entities/stop.entity';
import { RouteStop } from '../../route-stops/entities/route-stop.entity';
import {
  parseSeedData,
  computeRouteSeedActions,
  computeStopSeedActions,
  computeRouteStopSeedActions,
} from './metropolitano.seed';
import { seedSegmentGeometries } from './osrm-geometry.seed';

export interface SeedBus {
  code: string;
  capacity: number;
}

export interface SeedResult {
  toInsert: SeedBus[];
  skipped: SeedBus[];
}

export const SEED_BUSES: SeedBus[] = [
  { code: 'BUS-001', capacity: 40 },
  { code: 'BUS-002', capacity: 55 },
  { code: 'BUS-003', capacity: 30 },
];

export function computeSeedActions(
  existingCodes: string[],
  desiredBuses: SeedBus[],
): SeedResult {
  const toInsert = desiredBuses.filter((b) => !existingCodes.includes(b.code));
  const skipped = desiredBuses.filter((b) => existingCodes.includes(b.code));
  return { toInsert, skipped };
}

async function seed() {
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

  await dataSource.initialize();
  console.log('🌱 Seed script started');

  // ── Buses ──────────────────────────────────────────────────────────
  const busRepo = dataSource.getRepository(Bus);
  const existingBuses = await busRepo.find({ select: ['code'] });
  const existingCodes = existingBuses.map((b) => b.code);
  const busActions = computeSeedActions(existingCodes, SEED_BUSES);

  for (const busData of busActions.toInsert) {
    const bus = busRepo.create(busData);
    await busRepo.save(bus);
    console.log(
      `  ✅ Inserted bus: ${busData.code} (capacity: ${busData.capacity})`,
    );
  }
  for (const busData of busActions.skipped) {
    console.log(`  ⏭️  Skipped (already exists): ${busData.code}`);
  }
  console.log(
    `📊 Buses: ${busActions.toInsert.length} inserted, ${busActions.skipped.length} skipped`,
  );

  // ── Routes & Stops (Metropolitano) ──────────────────────────────────
  const metropolitanoRaw = require('../../../data/metropolitano_seed_example.json');
  const seedData = parseSeedData(metropolitanoRaw);

  // Routes
  const routeRepo = dataSource.getRepository(Route);
  const existingRoutes = await routeRepo.find({ select: ['name'] });
  const existingRouteNames = existingRoutes.map((r) => r.name);
  const routeActions = computeRouteSeedActions(
    existingRouteNames,
    seedData.routes,
  );

  for (const route of routeActions.toInsert) {
    await routeRepo.save(routeRepo.create(route));
    console.log(`  ✅ Inserted route: ${route.name}`);
  }
  for (const route of routeActions.skipped) {
    console.log(`  ⏭️  Skipped route (already exists): ${route.name}`);
  }
  console.log(
    `📊 Routes: ${routeActions.toInsert.length} inserted, ${routeActions.skipped.length} skipped`,
  );

  // Stops
  const stopRepo = dataSource.getRepository(Stop);
  const existingStops = await stopRepo.find({ select: ['name'] });
  const existingStopNames = existingStops.map((s) => s.name);
  const stopActions = computeStopSeedActions(
    existingStopNames,
    seedData.stops,
  );

  for (const stop of stopActions.toInsert) {
    await stopRepo.save(
      stopRepo.create({
        name: stop.name,
        latitude: stop.lat,
        longitude: stop.lng,
      }),
    );
    console.log(`  ✅ Inserted stop: ${stop.name}`);
  }
  for (const stop of stopActions.skipped) {
    console.log(`  ⏭️  Skipped stop (already exists): ${stop.name}`);
  }
  console.log(
    `📊 Stops: ${stopActions.toInsert.length} inserted, ${stopActions.skipped.length} skipped`,
  );

  // RouteStops — build lookup maps
  const allRoutes = await routeRepo.find({ select: ['id', 'name'] });
  const allStops = await stopRepo.find({ select: ['id', 'name'] });
  const routeNameToId = new Map(allRoutes.map((r) => [r.name, r.id]));
  const stopNameToId = new Map(allStops.map((s) => [s.name, s.id]));

  // Get existing route_stop composite keys (route_name + stop_order, no direction)
  const routeStopRepo = dataSource.getRepository(RouteStop);
  const existingRouteStops = await routeStopRepo.find({
    relations: ['route', 'stop'],
  });
  const existingRsKeys = existingRouteStops.map(
    (rs) => `${rs.route.name}|${rs.stop_order}`,
  );

  // Fallback: if relations are broken, query raw
  if (existingRsKeys.some((k) => k.includes('undefined'))) {
    const routeIdToName = new Map(allRoutes.map((r) => [Number(r.id), r.name]));
    const rawRs = await dataSource.query(
      `SELECT route_id, stop_order FROM route_stops`,
    );
    const resolvedKeys = rawRs.map(
      (r: any) =>
        `${routeIdToName.get(Number(r.route_id))}|${r.stop_order}`,
    );
    existingRsKeys.length = 0;
    existingRsKeys.push(...resolvedKeys);
  }

  const rsActions = computeRouteStopSeedActions(
    existingRsKeys,
    seedData.routeStops,
  );

  for (const rs of rsActions.toInsert) {
    const routeId = routeNameToId.get(rs.route_name);
    const stopId = stopNameToId.get(rs.stop_name);

    if (!routeId || !stopId) {
      throw new Error(
        `Referential integrity error: route=${rs.route_name} stop=${rs.stop_name}`,
      );
    }

    await routeStopRepo.save(
      routeStopRepo.create({
        route_id: routeId,
        stop_id: stopId,
        stop_order: rs.stop_order,
      }),
    );
    console.log(
      `  ✅ Inserted route_stop: ${rs.route_name} #${rs.stop_order} ${rs.stop_name}`,
    );
  }
  for (const rs of rsActions.skipped) {
    console.log(
      `  ⏭️  Skipped route_stop: ${rs.route_name} #${rs.stop_order}`,
    );
  }
  console.log(
    `📊 RouteStops: ${rsActions.toInsert.length} inserted, ${rsActions.skipped.length} skipped`,
  );

  // ── OSRM Segment Geometries ──────────────────────────────────────────
  console.log('🗺️  Seeding segment geometries from OSRM…');
  const geometryResult = await seedSegmentGeometries(routeStopRepo);
  console.log(
    `📊 Segment Geometries: ${geometryResult.updated} updated, ${geometryResult.skipped} skipped, ${geometryResult.failed} failed`,
  );

  await dataSource.destroy();
  console.log('👋 Seed script completed');
}

// Only run when executed directly (not when imported by tests)

if (typeof require !== 'undefined' && require.main === module) {
  seed().catch((error) => {
    console.error('❌ Seed script failed:', error);
    process.exit(1);
  });
}