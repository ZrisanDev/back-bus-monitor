import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateBusDto } from './create-bus.dto';

describe('CreateBusDto', () => {
  // ── Helper to validate a DTO instance ──────────────────────────────────

  async function validateDto(data: Record<string, unknown>) {
    const dto = plainToInstance(CreateBusDto, data);
    return validate(dto);
  }

  // ── SCN: Valid DTO passes validation ───────────────────────────────────

  it('should pass validation with valid code and capacity', async () => {
    const errors = await validateDto({ code: 'BUS-001', capacity: 40 });

    expect(errors).toHaveLength(0);
  });

  // ── SCN: Triangulation — another valid DTO ─────────────────────────────

  it('should pass validation with different valid values', async () => {
    const errors = await validateDto({ code: 'A', capacity: 1 });

    expect(errors).toHaveLength(0);
  });

  // ── SCN: code must be a string ─────────────────────────────────────────

  it('should fail when code is not a string', async () => {
    const errors = await validateDto({ code: 123, capacity: 40 });

    expect(errors.length).toBeGreaterThan(0);
    const codeErrors = errors.find((e) => e.property === 'code');
    expect(codeErrors).toBeDefined();
    expect(codeErrors!.constraints).toHaveProperty('isString');
  });

  // ── SCN: code must not be empty ────────────────────────────────────────

  it('should fail when code is empty string', async () => {
    const errors = await validateDto({ code: '', capacity: 40 });

    expect(errors.length).toBeGreaterThan(0);
    const codeErrors = errors.find((e) => e.property === 'code');
    expect(codeErrors).toBeDefined();
    expect(codeErrors!.constraints).toHaveProperty('isNotEmpty');
  });

  // ── SCN: code must have at least 1 character (minLength) ───────────────

  it('should fail when code has minLength violation', async () => {
    const errors = await validateDto({ code: '', capacity: 40 });

    const codeErrors = errors.find((e) => e.property === 'code');
    expect(codeErrors).toBeDefined();
    expect(codeErrors!.constraints).toHaveProperty('minLength');
  });

  // ── SCN: code is required (missing) ────────────────────────────────────

  it('should fail when code is missing', async () => {
    const errors = await validateDto({ capacity: 40 });

    expect(errors.length).toBeGreaterThan(0);
    const codeErrors = errors.find((e) => e.property === 'code');
    expect(codeErrors).toBeDefined();
  });

  // ── SCN: capacity must be an integer ───────────────────────────────────

  it('should fail when capacity is not an integer', async () => {
    const errors = await validateDto({ code: 'BUS-001', capacity: 3.5 });

    expect(errors.length).toBeGreaterThan(0);
    const capErrors = errors.find((e) => e.property === 'capacity');
    expect(capErrors).toBeDefined();
    expect(capErrors!.constraints).toHaveProperty('isInt');
  });

  // ── SCN: capacity must be at least 1 (positive) ────────────────────────

  it('should fail when capacity is 0', async () => {
    const errors = await validateDto({ code: 'BUS-001', capacity: 0 });

    expect(errors.length).toBeGreaterThan(0);
    const capErrors = errors.find((e) => e.property === 'capacity');
    expect(capErrors).toBeDefined();
    expect(capErrors!.constraints).toHaveProperty('min');
  });

  // ── SCN: Triangulation — negative capacity ─────────────────────────────

  it('should fail when capacity is negative', async () => {
    const errors = await validateDto({ code: 'BUS-001', capacity: -10 });

    expect(errors.length).toBeGreaterThan(0);
    const capErrors = errors.find((e) => e.property === 'capacity');
    expect(capErrors).toBeDefined();
    expect(capErrors!.constraints).toHaveProperty('min');
  });

  // ── SCN: capacity is required (missing) ────────────────────────────────

  it('should fail when capacity is missing', async () => {
    const errors = await validateDto({ code: 'BUS-001' });

    expect(errors.length).toBeGreaterThan(0);
    const capErrors = errors.find((e) => e.property === 'capacity');
    expect(capErrors).toBeDefined();
  });

  // ── SCN: capacity must be a number (not string) ────────────────────────

  it('should fail when capacity is a string', async () => {
    const errors = await validateDto({ code: 'BUS-001', capacity: 'forty' });

    expect(errors.length).toBeGreaterThan(0);
    const capErrors = errors.find((e) => e.property === 'capacity');
    expect(capErrors).toBeDefined();
  });
});
