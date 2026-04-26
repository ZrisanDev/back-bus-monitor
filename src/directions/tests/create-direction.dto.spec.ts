import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateDirectionDto } from '../dto/create-direction.dto';

describe('CreateDirectionDto', () => {
  async function validateDto(data: Record<string, unknown>) {
    const dto = plainToInstance(CreateDirectionDto, data);
    return validate(dto);
  }

  // ── SCN: Valid DTO passes validation ───────────────────────────────────────

  it('should pass validation with valid code, label_es, label_en', async () => {
    const errors = await validateDto({
      code: 'NORTE_SUR',
      label_es: 'Norte → Sur',
      label_en: 'North → South',
    });
    expect(errors).toHaveLength(0);
  });

  // ── SCN: Triangulation — another valid DTO ────────────────────────────────

  it('should pass validation with different valid values', async () => {
    const errors = await validateDto({
      code: 'ESTE_OESTE',
      label_es: 'Este → Oeste',
      label_en: 'East → West',
    });
    expect(errors).toHaveLength(0);
  });

  // ── SCN: code must be a string ─────────────────────────────────────────────

  it('should fail when code is not a string', async () => {
    const errors = await validateDto({
      code: 123,
      label_es: 'Norte',
      label_en: 'North',
    });
    expect(errors.length).toBeGreaterThan(0);
    const codeErrors = errors.find((e) => e.property === 'code');
    expect(codeErrors).toBeDefined();
    expect(codeErrors!.constraints).toHaveProperty('isString');
  });

  // ── SCN: code must not be empty ────────────────────────────────────────────

  it('should fail when code is empty', async () => {
    const errors = await validateDto({
      code: '',
      label_es: 'Norte',
      label_en: 'North',
    });
    expect(errors.length).toBeGreaterThan(0);
    const codeErrors = errors.find((e) => e.property === 'code');
    expect(codeErrors).toBeDefined();
    expect(codeErrors!.constraints).toHaveProperty('isNotEmpty');
  });

  // ── SCN: code is required ──────────────────────────────────────────────────

  it('should fail when code is missing', async () => {
    const errors = await validateDto({
      label_es: 'Norte',
      label_en: 'North',
    });
    expect(errors.length).toBeGreaterThan(0);
    const codeErrors = errors.find((e) => e.property === 'code');
    expect(codeErrors).toBeDefined();
  });

  // ── SCN: code max length 30 ────────────────────────────────────────────────

  it('should fail when code exceeds 30 characters', async () => {
    const errors = await validateDto({
      code: 'A'.repeat(31),
      label_es: 'Norte',
      label_en: 'North',
    });
    expect(errors.length).toBeGreaterThan(0);
    const codeErrors = errors.find((e) => e.property === 'code');
    expect(codeErrors).toBeDefined();
    expect(codeErrors!.constraints).toHaveProperty('maxLength');
  });

  // ── SCN: label_es must be a string ─────────────────────────────────────────

  it('should fail when label_es is not a string', async () => {
    const errors = await validateDto({
      code: 'TEST',
      label_es: 123,
      label_en: 'North',
    });
    expect(errors.length).toBeGreaterThan(0);
    const labelErrors = errors.find((e) => e.property === 'label_es');
    expect(labelErrors).toBeDefined();
    expect(labelErrors!.constraints).toHaveProperty('isString');
  });

  // ── SCN: label_es must not be empty ────────────────────────────────────────

  it('should fail when label_es is empty', async () => {
    const errors = await validateDto({
      code: 'TEST',
      label_es: '',
      label_en: 'North',
    });
    expect(errors.length).toBeGreaterThan(0);
    const labelErrors = errors.find((e) => e.property === 'label_es');
    expect(labelErrors).toBeDefined();
    expect(labelErrors!.constraints).toHaveProperty('isNotEmpty');
  });

  // ── SCN: label_en must be a string ─────────────────────────────────────────

  it('should fail when label_en is not a string', async () => {
    const errors = await validateDto({
      code: 'TEST',
      label_es: 'Norte',
      label_en: 456,
    });
    expect(errors.length).toBeGreaterThan(0);
    const labelErrors = errors.find((e) => e.property === 'label_en');
    expect(labelErrors).toBeDefined();
    expect(labelErrors!.constraints).toHaveProperty('isString');
  });

  // ── SCN: label_en must not be empty ────────────────────────────────────────

  it('should fail when label_en is empty', async () => {
    const errors = await validateDto({
      code: 'TEST',
      label_es: 'Norte',
      label_en: '',
    });
    expect(errors.length).toBeGreaterThan(0);
    const labelErrors = errors.find((e) => e.property === 'label_en');
    expect(labelErrors).toBeDefined();
    expect(labelErrors!.constraints).toHaveProperty('isNotEmpty');
  });
});
