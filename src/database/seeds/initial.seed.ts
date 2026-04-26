import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Bus } from '../../buses/entities/bus.entity';
import { Report } from '../../reports/entities/report.entity';
import { Route } from '../../routes/entities/route.entity';
import { Stop } from '../../stops/entities/stop.entity';
import { Direction } from '../../directions/entities/direction.entity';
import { DayType } from '../../day-types/entities/day-type.entity';
import { RouteStop } from '../../route-stops/entities/route-stop.entity';
import { Schedule } from '../../schedules/entities/schedule.entity';
import { SEED_DAY_TYPES, computeDayTypeSeedActions } from './day-types.seed';
import {
  SEED_DIRECTIONS,
  computeDirectionSeedActions,
} from './directions.seed';
import {
  parseSeedData,
  computeRouteSeedActions,
  computeStopSeedActions,
  computeRouteStopSeedActions,
  computeScheduleSeedActions,
} from './metropolitano.seed';

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
    entities: [
      Bus,
      Report,
      Route,
      Stop,
      Direction,
      DayType,
      RouteStop,
      Schedule,
    ],
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

  // ── DayTypes ───────────────────────────────────────────────────────
  const dayTypeRepo = dataSource.getRepository(DayType);
  const existingDayTypes = await dayTypeRepo.find({ select: ['code'] });
  const existingDayTypeCodes = existingDayTypes.map((d) => d.code);
  const dayTypeActions = computeDayTypeSeedActions(
    existingDayTypeCodes,
    SEED_DAY_TYPES,
  );

  for (const dt of dayTypeActions.toInsert) {
    await dayTypeRepo.save(dayTypeRepo.create(dt));
    console.log(`  ✅ Inserted day_type: ${dt.code}`);
  }
  for (const dt of dayTypeActions.skipped) {
    console.log(`  ⏭️  Skipped (already exists): ${dt.code}`);
  }
  console.log(
    `📊 DayTypes: ${dayTypeActions.toInsert.length} inserted, ${dayTypeActions.skipped.length} skipped`,
  );

  // ── Directions ─────────────────────────────────────────────────────
  const directionRepo = dataSource.getRepository(Direction);
  const existingDirections = await directionRepo.find({ select: ['code'] });
  const existingDirCodes = existingDirections.map((d) => d.code);
  const dirActions = computeDirectionSeedActions(
    existingDirCodes,
    SEED_DIRECTIONS,
  );

  for (const dir of dirActions.toInsert) {
    await directionRepo.save(directionRepo.create(dir));
    console.log(`  ✅ Inserted direction: ${dir.code}`);
  }
  for (const dir of dirActions.skipped) {
    console.log(`  ⏭️  Skipped (already exists): ${dir.code}`);
  }
  console.log(
    `📊 Directions: ${dirActions.toInsert.length} inserted, ${dirActions.skipped.length} skipped`,
  );

  // ── Metropolitano seed (Expreso 1) ─────────────────────────────────
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

  // RouteStops — build lookup maps for resolved IDs
  const allRoutes = await routeRepo.find({ select: ['id', 'name'] });
  const allStops = await stopRepo.find({ select: ['id', 'name'] });
  const allDirs = await directionRepo.find({ select: ['id', 'code'] });
  const allDayTypeRows = await dayTypeRepo.find({ select: ['id', 'code'] });
  const routeNameToId = new Map(allRoutes.map((r) => [r.name, r.id]));
  const stopNameToId = new Map(allStops.map((s) => [s.name, s.id]));
  const dirCodeToId = new Map(allDirs.map((d) => [d.code, d.id]));
  const dayTypeCodeToId = new Map(
    allDayTypeRows.map((dt) => [dt.code, dt.id]),
  );

  // Get existing route_stop composite keys
  const routeStopRepo = dataSource.getRepository(RouteStop);
  const existingRouteStops = await routeStopRepo.find({
    relations: ['route', 'stop', 'direction'],
  });
  const existingRsKeys = existingRouteStops.map(
    (rs) => `${rs.route.name}|${rs.direction.code}|${rs.stop_order}`,
  );

  // Fallback: also query by raw IDs if relations don't have names
  if (existingRsKeys.some((k) => k.includes('undefined'))) {
    // Build keys from IDs using lookup maps (reverse)
    const routeIdToName = new Map(
      allRoutes.map((r) => [Number(r.id), r.name]),
    );
    const dirIdToCode = new Map(allDirs.map((d) => [Number(d.id), d.code]));
    const rawRs = await dataSource.query(
      `SELECT route_id, direction_id, stop_order FROM route_stops`,
    );
    const resolvedKeys = rawRs.map(
      (r: any) =>
        `${routeIdToName.get(Number(r.route_id))}|${dirIdToCode.get(Number(r.direction_id))}|${r.stop_order}`,
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
    const directionId = dirCodeToId.get(rs.direction_code);

    if (!routeId || !stopId || !directionId) {
      throw new Error(
        `Referential integrity error: route=${rs.route_name} stop=${rs.stop_name} direction=${rs.direction_code}`,
      );
    }

    await routeStopRepo.save(
      routeStopRepo.create({
        route_id: routeId,
        stop_id: stopId,
        direction_id: directionId,
        stop_order: rs.stop_order,
      }),
    );
    console.log(
      `  ✅ Inserted route_stop: ${rs.route_name} ${rs.direction_code} #${rs.stop_order} ${rs.stop_name}`,
    );
  }
  for (const rs of rsActions.skipped) {
    console.log(
      `  ⏭️  Skipped route_stop: ${rs.route_name} ${rs.direction_code} #${rs.stop_order}`,
    );
  }
  console.log(
    `📊 RouteStops: ${rsActions.toInsert.length} inserted, ${rsActions.skipped.length} skipped`,
  );

  // Schedules
  const scheduleRepo = dataSource.getRepository(Schedule);
  const existingSchedules = await dataSource.query(
    `SELECT s.route_id, s.direction_id, s.day_type_id FROM schedules s`,
  );
  const routeIdToName = new Map(
    allRoutes.map((r) => [Number(r.id), r.name]),
  );
  const dirIdToCode = new Map(allDirs.map((d) => [Number(d.id), d.code]));
  const dayTypeIdToCode = new Map(
    allDayTypeRows.map((dt) => [Number(dt.id), dt.code]),
  );
  const existingScheduleKeys = existingSchedules.map(
    (row: any) =>
      `${routeIdToName.get(Number(row.route_id))}|${dirIdToCode.get(Number(row.direction_id))}|${dayTypeIdToCode.get(Number(row.day_type_id))}`,
  );

  const scheduleActions = computeScheduleSeedActions(
    existingScheduleKeys,
    seedData.schedules,
  );

  for (const sc of scheduleActions.toInsert) {
    const routeId = routeNameToId.get(sc.route_name);
    const directionId = dirCodeToId.get(sc.direction_code);
    const dayTypeId = dayTypeCodeToId.get(sc.day_type_code);

    if (!routeId || !directionId || !dayTypeId) {
      throw new Error(
        `Referential integrity error: route=${sc.route_name} direction=${sc.direction_code} day_type=${sc.day_type_code}`,
      );
    }

    await scheduleRepo.save(
      scheduleRepo.create({
        route_id: routeId,
        direction_id: directionId,
        day_type_id: dayTypeId,
        start_time: sc.start_time,
        end_time: sc.end_time,
        is_operating: sc.is_operating,
      }),
    );
    console.log(
      `  ✅ Inserted schedule: ${sc.route_name} ${sc.direction_code} ${sc.day_type_code}`,
    );
  }
  for (const sc of scheduleActions.skipped) {
    console.log(
      `  ⏭️  Skipped schedule: ${sc.route_name} ${sc.direction_code} ${sc.day_type_code}`,
    );
  }
  console.log(
    `📊 Schedules: ${scheduleActions.toInsert.length} inserted, ${scheduleActions.skipped.length} skipped`,
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
