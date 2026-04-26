import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateDayTypeDto } from '../dto/create-day-type.dto';

describe('CreateDayTypeDto', () => {
  async function validateDto(data: Record<string, unknown>) {
    const dto = plainToInstance(CreateDayTypeDto, data);
    return validate(dto);
  }

  it('should pass validation with valid code, label_es, label_en', async () => {
    const errors = await validateDto({
      code: 'LUNES_VIERNES',
      label_es: 'Lunes a Viernes',
      label_en: 'Monday to Friday',
    });
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with different valid values', async () => {
    const errors = await validateDto({
      code: 'SABADO',
      label_es: 'Sábado',
      label_en: 'Saturday',
    });
    expect(errors).toHaveLength(0);
  });

  it('should fail when code is not a string', async () => {
    const errors = await validateDto({
      code: 123,
      label_es: 'Lunes',
      label_en: 'Monday',
    });
    expect(errors.length).toBeGreaterThan(0);
    const codeErrors = errors.find((e) => e.property === 'code');
    expect(codeErrors).toBeDefined();
    expect(codeErrors!.constraints).toHaveProperty('isString');
  });

  it('should fail when code is empty', async () => {
    const errors = await validateDto({
      code: '',
      label_es: 'Lunes',
      label_en: 'Monday',
    });
    expect(errors.length).toBeGreaterThan(0);
    const codeErrors = errors.find((e) => e.property === 'code');
    expect(codeErrors).toBeDefined();
    expect(codeErrors!.constraints).toHaveProperty('isNotEmpty');
  });

  it('should fail when code is missing', async () => {
    const errors = await validateDto({
      label_es: 'Lunes',
      label_en: 'Monday',
    });
    expect(errors.length).toBeGreaterThan(0);
    const codeErrors = errors.find((e) => e.property === 'code');
    expect(codeErrors).toBeDefined();
  });

  it('should fail when code exceeds 30 characters', async () => {
    const errors = await validateDto({
      code: 'A'.repeat(31),
      label_es: 'Lunes',
      label_en: 'Monday',
    });
    expect(errors.length).toBeGreaterThan(0);
    const codeErrors = errors.find((e) => e.property === 'code');
    expect(codeErrors).toBeDefined();
    expect(codeErrors!.constraints).toHaveProperty('maxLength');
  });

  it('should fail when label_es is not a string', async () => {
    const errors = await validateDto({
      code: 'TEST',
      label_es: 123,
      label_en: 'Monday',
    });
    expect(errors.length).toBeGreaterThan(0);
    const labelErrors = errors.find((e) => e.property === 'label_es');
    expect(labelErrors).toBeDefined();
    expect(labelErrors!.constraints).toHaveProperty('isString');
  });

  it('should fail when label_es is empty', async () => {
    const errors = await validateDto({
      code: 'TEST',
      label_es: '',
      label_en: 'Monday',
    });
    expect(errors.length).toBeGreaterThan(0);
    const labelErrors = errors.find((e) => e.property === 'label_es');
    expect(labelErrors).toBeDefined();
    expect(labelErrors!.constraints).toHaveProperty('isNotEmpty');
  });

  it('should fail when label_en is not a string', async () => {
    const errors = await validateDto({
      code: 'TEST',
      label_es: 'Lunes',
      label_en: 456,
    });
    expect(errors.length).toBeGreaterThan(0);
    const labelErrors = errors.find((e) => e.property === 'label_en');
    expect(labelErrors).toBeDefined();
    expect(labelErrors!.constraints).toHaveProperty('isString');
  });

  it('should fail when label_en is empty', async () => {
    const errors = await validateDto({
      code: 'TEST',
      label_es: 'Lunes',
      label_en: '',
    });
    expect(errors.length).toBeGreaterThan(0);
    const labelErrors = errors.find((e) => e.property === 'label_en');
    expect(labelErrors).toBeDefined();
    expect(labelErrors!.constraints).toHaveProperty('isNotEmpty');
  });
});
