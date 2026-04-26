import {
  SEED_DAY_TYPES,
  computeDayTypeSeedActions,
} from '../../database/seeds/day-types.seed';

describe('computeDayTypeSeedActions', () => {
  it('should return all day types to insert when no existing codes', () => {
    const result = computeDayTypeSeedActions([], SEED_DAY_TYPES);

    expect(result.toInsert).toHaveLength(4);
    expect(result.toInsert).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'LUNES_VIERNES' }),
        expect.objectContaining({ code: 'SABADO' }),
        expect.objectContaining({ code: 'DOMINGO' }),
        expect.objectContaining({ code: 'FERIADO' }),
      ]),
    );
    expect(result.skipped).toHaveLength(0);
  });

  it('should skip day types whose codes already exist', () => {
    const existingCodes = ['LUNES_VIERNES', 'DOMINGO'];
    const result = computeDayTypeSeedActions(existingCodes, SEED_DAY_TYPES);

    expect(result.toInsert).toHaveLength(2);
    expect(result.toInsert).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'SABADO' }),
        expect.objectContaining({ code: 'FERIADO' }),
      ]),
    );
    expect(result.skipped).toHaveLength(2);
  });

  it('should skip all day types when every code already exists', () => {
    const existingCodes = ['LUNES_VIERNES', 'SABADO', 'DOMINGO', 'FERIADO'];
    const result = computeDayTypeSeedActions(existingCodes, SEED_DAY_TYPES);

    expect(result.toInsert).toHaveLength(0);
    expect(result.skipped).toHaveLength(4);
  });
});

describe('SEED_DAY_TYPES constant', () => {
  it('should define exactly 4 seed day types', () => {
    expect(SEED_DAY_TYPES).toHaveLength(4);
  });

  it('should have distinct codes for each seed day type', () => {
    const codes = SEED_DAY_TYPES.map((d) => d.code);
    expect(new Set(codes).size).toBe(4);
  });

  it('should have LUNES_VIERNES with correct labels', () => {
    const lv = SEED_DAY_TYPES.find((d) => d.code === 'LUNES_VIERNES');
    expect(lv).toBeDefined();
    expect(lv!.label_es).toBe('Lunes a Viernes');
    expect(lv!.label_en).toBe('Monday to Friday');
  });

  it('should have SABADO with correct labels', () => {
    const s = SEED_DAY_TYPES.find((d) => d.code === 'SABADO');
    expect(s).toBeDefined();
    expect(s!.label_es).toBe('Sábado');
    expect(s!.label_en).toBe('Saturday');
  });

  it('should have DOMINGO with correct labels', () => {
    const d = SEED_DAY_TYPES.find((d) => d.code === 'DOMINGO');
    expect(d).toBeDefined();
    expect(d!.label_es).toBe('Domingo');
    expect(d!.label_en).toBe('Sunday');
  });

  it('should have FERIADO with correct labels', () => {
    const f = SEED_DAY_TYPES.find((d) => d.code === 'FERIADO');
    expect(f).toBeDefined();
    expect(f!.label_es).toBe('Feriado');
    expect(f!.label_en).toBe('Holiday');
  });
});
