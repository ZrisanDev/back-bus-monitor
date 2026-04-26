import { DayType } from '../../day-types/entities/day-type.entity';

export interface SeedDayType {
  code: string;
  label_es: string;
  label_en: string;
}

export interface SeedDayTypeResult {
  toInsert: SeedDayType[];
  skipped: SeedDayType[];
}

export const SEED_DAY_TYPES: SeedDayType[] = [
  { code: 'LUNES_VIERNES', label_es: 'Lunes a Viernes', label_en: 'Monday to Friday' },
  { code: 'SABADO', label_es: 'Sábado', label_en: 'Saturday' },
  { code: 'DOMINGO', label_es: 'Domingo', label_en: 'Sunday' },
  { code: 'FERIADO', label_es: 'Feriado', label_en: 'Holiday' },
];

export function computeDayTypeSeedActions(
  existingCodes: string[],
  desiredDayTypes: SeedDayType[],
): SeedDayTypeResult {
  const toInsert = desiredDayTypes.filter(
    (d) => !existingCodes.includes(d.code),
  );
  const skipped = desiredDayTypes.filter((d) =>
    existingCodes.includes(d.code),
  );
  return { toInsert, skipped };
}
