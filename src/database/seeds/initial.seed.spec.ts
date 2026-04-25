import { computeSeedActions, SEED_BUSES } from './initial.seed';

describe('computeSeedActions', () => {
  it('should return all buses to insert when no existing codes', () => {
    const result = computeSeedActions([], SEED_BUSES);

    expect(result.toInsert).toHaveLength(3);
    expect(result.toInsert).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'BUS-001', capacity: 40 }),
        expect.objectContaining({ code: 'BUS-002', capacity: 55 }),
        expect.objectContaining({ code: 'BUS-003', capacity: 30 }),
      ]),
    );
    expect(result.skipped).toHaveLength(0);
  });

  it('should skip buses whose codes already exist in the database', () => {
    const existingCodes = ['BUS-001', 'BUS-003'];
    const result = computeSeedActions(existingCodes, SEED_BUSES);

    expect(result.toInsert).toHaveLength(1);
    expect(result.toInsert[0]).toEqual(
      expect.objectContaining({ code: 'BUS-002', capacity: 55 }),
    );
    expect(result.skipped).toHaveLength(2);
    expect(result.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'BUS-001' }),
        expect.objectContaining({ code: 'BUS-003' }),
      ]),
    );
  });

  it('should skip all buses when every code already exists', () => {
    const existingCodes = ['BUS-001', 'BUS-002', 'BUS-003'];
    const result = computeSeedActions(existingCodes, SEED_BUSES);

    expect(result.toInsert).toHaveLength(0);
    expect(result.skipped).toHaveLength(3);
  });
});

describe('SEED_BUSES constant', () => {
  it('should define exactly 3 seed buses', () => {
    expect(SEED_BUSES).toHaveLength(3);
  });

  it('should have distinct codes for each seed bus', () => {
    const codes = SEED_BUSES.map((b) => b.code);
    expect(new Set(codes).size).toBe(3);
  });

  it('should have positive capacities', () => {
    for (const bus of SEED_BUSES) {
      expect(bus.capacity).toBeGreaterThan(0);
    }
  });
});
