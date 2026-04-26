import { SEED_DIRECTIONS, computeDirectionSeedActions } from '../../database/seeds/directions.seed';

describe('computeDirectionSeedActions', () => {
  it('should return all directions to insert when no existing codes', () => {
    const result = computeDirectionSeedActions([], SEED_DIRECTIONS);

    expect(result.toInsert).toHaveLength(4);
    expect(result.toInsert).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'NORTE_SUR' }),
        expect.objectContaining({ code: 'SUR_NORTE' }),
        expect.objectContaining({ code: 'ESTE_OESTE' }),
        expect.objectContaining({ code: 'OESTE_ESTE' }),
      ]),
    );
    expect(result.skipped).toHaveLength(0);
  });

  it('should skip directions whose codes already exist', () => {
    const existingCodes = ['NORTE_SUR', 'ESTE_OESTE'];
    const result = computeDirectionSeedActions(existingCodes, SEED_DIRECTIONS);

    expect(result.toInsert).toHaveLength(2);
    expect(result.toInsert).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'SUR_NORTE' }),
        expect.objectContaining({ code: 'OESTE_ESTE' }),
      ]),
    );
    expect(result.skipped).toHaveLength(2);
  });

  it('should skip all directions when every code already exists', () => {
    const existingCodes = ['NORTE_SUR', 'SUR_NORTE', 'ESTE_OESTE', 'OESTE_ESTE'];
    const result = computeDirectionSeedActions(existingCodes, SEED_DIRECTIONS);

    expect(result.toInsert).toHaveLength(0);
    expect(result.skipped).toHaveLength(4);
  });
});

describe('SEED_DIRECTIONS constant', () => {
  it('should define exactly 4 seed directions', () => {
    expect(SEED_DIRECTIONS).toHaveLength(4);
  });

  it('should have distinct codes for each seed direction', () => {
    const codes = SEED_DIRECTIONS.map((d) => d.code);
    expect(new Set(codes).size).toBe(4);
  });

  it('should have NORTE_SUR with correct labels', () => {
    const ns = SEED_DIRECTIONS.find((d) => d.code === 'NORTE_SUR');
    expect(ns).toBeDefined();
    expect(ns!.label_es).toBe('Norte → Sur');
    expect(ns!.label_en).toBe('North → South');
  });

  it('should have SUR_NORTE with correct labels', () => {
    const sn = SEED_DIRECTIONS.find((d) => d.code === 'SUR_NORTE');
    expect(sn).toBeDefined();
    expect(sn!.label_es).toBe('Sur → Norte');
    expect(sn!.label_en).toBe('South → North');
  });

  it('should have ESTE_OESTE with correct labels', () => {
    const eo = SEED_DIRECTIONS.find((d) => d.code === 'ESTE_OESTE');
    expect(eo).toBeDefined();
    expect(eo!.label_es).toBe('Este → Oeste');
    expect(eo!.label_en).toBe('East → West');
  });

  it('should have OESTE_ESTE with correct labels', () => {
    const oe = SEED_DIRECTIONS.find((d) => d.code === 'OESTE_ESTE');
    expect(oe).toBeDefined();
    expect(oe!.label_es).toBe('Oeste → Este');
    expect(oe!.label_en).toBe('West → East');
  });
});
