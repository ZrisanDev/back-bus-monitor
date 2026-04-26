import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateRouteDto } from '../dto/create-route.dto';

describe('CreateRouteDto', () => {
  async function validateDto(data: Record<string, unknown>) {
    const dto = plainToInstance(CreateRouteDto, data);
    return validate(dto);
  }

  it('should pass validation with valid name', async () => {
    const errors = await validateDto({ name: 'Línea 1' });
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with name and description', async () => {
    const errors = await validateDto({
      name: 'Línea 2',
      description: 'Route through downtown',
    });
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with name and null description', async () => {
    const errors = await validateDto({ name: 'Línea 3', description: null });
    expect(errors).toHaveLength(0);
  });

  it('should fail when name is not a string', async () => {
    const errors = await validateDto({ name: 123 });
    expect(errors.length).toBeGreaterThan(0);
    const nameErrors = errors.find((e) => e.property === 'name');
    expect(nameErrors).toBeDefined();
    expect(nameErrors!.constraints).toHaveProperty('isString');
  });

  it('should fail when name is empty', async () => {
    const errors = await validateDto({ name: '' });
    expect(errors.length).toBeGreaterThan(0);
    const nameErrors = errors.find((e) => e.property === 'name');
    expect(nameErrors).toBeDefined();
    expect(nameErrors!.constraints).toHaveProperty('isNotEmpty');
  });

  it('should fail when name is missing', async () => {
    const errors = await validateDto({});
    expect(errors.length).toBeGreaterThan(0);
    const nameErrors = errors.find((e) => e.property === 'name');
    expect(nameErrors).toBeDefined();
  });

  it('should fail when name exceeds 120 characters', async () => {
    const errors = await validateDto({ name: 'A'.repeat(121) });
    expect(errors.length).toBeGreaterThan(0);
    const nameErrors = errors.find((e) => e.property === 'name');
    expect(nameErrors).toBeDefined();
    expect(nameErrors!.constraints).toHaveProperty('maxLength');
  });
});
