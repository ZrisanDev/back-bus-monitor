import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Bus } from '../../buses/entities/bus.entity';

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
    entities: [Bus],
  });

  await dataSource.initialize();
  console.log('🌱 Seed script started');

  const busRepo = dataSource.getRepository(Bus);
  const existingBuses = await busRepo.find({ select: ['code'] });
  const existingCodes = existingBuses.map((b) => b.code);

  const { toInsert, skipped } = computeSeedActions(existingCodes, SEED_BUSES);

  for (const busData of toInsert) {
    const bus = busRepo.create(busData);
    await busRepo.save(bus);
    console.log(
      `  ✅ Inserted bus: ${busData.code} (capacity: ${busData.capacity})`,
    );
  }

  for (const busData of skipped) {
    console.log(`  ⏭️  Skipped (already exists): ${busData.code}`);
  }

  console.log(
    `\n📊 Summary: ${toInsert.length} inserted, ${skipped.length} skipped`,
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
