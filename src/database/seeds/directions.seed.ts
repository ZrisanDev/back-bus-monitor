import { Direction } from '../../directions/entities/direction.entity';

export interface SeedDirection {
  code: string;
  label_es: string;
  label_en: string;
}

export interface SeedDirectionResult {
  toInsert: SeedDirection[];
  skipped: SeedDirection[];
}

export const SEED_DIRECTIONS: SeedDirection[] = [
  { code: 'NORTE_SUR', label_es: 'Norte → Sur', label_en: 'North → South' },
  { code: 'SUR_NORTE', label_es: 'Sur → Norte', label_en: 'South → North' },
  { code: 'ESTE_OESTE', label_es: 'Este → Oeste', label_en: 'East → West' },
  { code: 'OESTE_ESTE', label_es: 'Oeste → Este', label_en: 'West → East' },
];

export function computeDirectionSeedActions(
  existingCodes: string[],
  desiredDirections: SeedDirection[],
): SeedDirectionResult {
  const toInsert = desiredDirections.filter(
    (d) => !existingCodes.includes(d.code),
  );
  const skipped = desiredDirections.filter((d) =>
    existingCodes.includes(d.code),
  );
  return { toInsert, skipped };
}
