import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateStopDto } from '../dto/create-stop.dto';

describe('CreateStopDto', () => {
  async function validateDto(data: Record<string, unknown>) {
    const dto = plainToInstance(CreateStopDto, data);
    return validate(dto);
  }

  it('should pass validation with valid name and coordinates', async () => {
    const errors = await validateDto({
      name: 'Parada Central',
      latitude: -34.603722,
      longitude: -58.381592,
    });
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with boundary latitude values', async () => {
    const errors1 = await validateDto({
      name: 'North Pole',
      latitude: 90,
      longitude: 0,
    });
    expect(errors1).toHaveLength(0);

    const errors2 = await validateDto({
      name: 'South Pole',
      latitude: -90,
      longitude: 0,
    });
    expect(errors2).toHaveLength(0);
  });

  it('should pass validation with boundary longitude values', async () => {
    const errors1 = await validateDto({
      name: 'East Limit',
      latitude: 0,
      longitude: 180,
    });
    expect(errors1).toHaveLength(0);

    const errors2 = await validateDto({
      name: 'West Limit',
      latitude: 0,
      longitude: -180,
    });
    expect(errors2).toHaveLength(0);
  });

  it('should fail when name is not a string', async () => {
    const errors = await validateDto({
      name: 123,
      latitude: -34.6,
      longitude: -58.3,
    });
    expect(errors.length).toBeGreaterThan(0);
    const nameErrors = errors.find((e) => e.property === 'name');
    expect(nameErrors).toBeDefined();
    expect(nameErrors!.constraints).toHaveProperty('isString');
  });

  it('should fail when name is empty', async () => {
    const errors = await validateDto({
      name: '',
      latitude: -34.6,
      longitude: -58.3,
    });
    expect(errors.length).toBeGreaterThan(0);
    const nameErrors = errors.find((e) => e.property === 'name');
    expect(nameErrors).toBeDefined();
    expect(nameErrors!.constraints).toHaveProperty('isNotEmpty');
  });

  it('should fail when name exceeds 150 characters', async () => {
    const errors = await validateDto({
      name: 'A'.repeat(151),
      latitude: -34.6,
      longitude: -58.3,
    });
    expect(errors.length).toBeGreaterThan(0);
    const nameErrors = errors.find((e) => e.property === 'name');
    expect(nameErrors).toBeDefined();
    expect(nameErrors!.constraints).toHaveProperty('maxLength');
  });

  it('should fail when latitude is not a number', async () => {
    const errors = await validateDto({
      name: 'Test Stop',
      latitude: 'not-a-number',
      longitude: -58.3,
    });
    expect(errors.length).toBeGreaterThan(0);
    const latErrors = errors.find((e) => e.property === 'latitude');
    expect(latErrors).toBeDefined();
    expect(latErrors!.constraints).toHaveProperty('isNumber');
  });

  it('should fail when latitude > 90', async () => {
    const errors = await validateDto({
      name: 'Test Stop',
      latitude: 91,
      longitude: -58.3,
    });
    expect(errors.length).toBeGreaterThan(0);
    const latErrors = errors.find((e) => e.property === 'latitude');
    expect(latErrors).toBeDefined();
    expect(latErrors!.constraints).toHaveProperty('max');
  });

  it('should fail when latitude < -90', async () => {
    const errors = await validateDto({
      name: 'Test Stop',
      latitude: -91,
      longitude: -58.3,
    });
    expect(errors.length).toBeGreaterThan(0);
    const latErrors = errors.find((e) => e.property === 'latitude');
    expect(latErrors).toBeDefined();
    expect(latErrors!.constraints).toHaveProperty('min');
  });

  it('should fail when longitude is not a number', async () => {
    const errors = await validateDto({
      name: 'Test Stop',
      latitude: -34.6,
      longitude: 'not-a-number',
    });
    expect(errors.length).toBeGreaterThan(0);
    const lngErrors = errors.find((e) => e.property === 'longitude');
    expect(lngErrors).toBeDefined();
    expect(lngErrors!.constraints).toHaveProperty('isNumber');
  });

  it('should fail when longitude > 180', async () => {
    const errors = await validateDto({
      name: 'Test Stop',
      latitude: -34.6,
      longitude: 181,
    });
    expect(errors.length).toBeGreaterThan(0);
    const lngErrors = errors.find((e) => e.property === 'longitude');
    expect(lngErrors).toBeDefined();
    expect(lngErrors!.constraints).toHaveProperty('max');
  });

  it('should fail when longitude < -180', async () => {
    const errors = await validateDto({
      name: 'Test Stop',
      latitude: -34.6,
      longitude: -181,
    });
    expect(errors.length).toBeGreaterThan(0);
    const lngErrors = errors.find((e) => e.property === 'longitude');
    expect(lngErrors).toBeDefined();
    expect(lngErrors!.constraints).toHaveProperty('min');
  });

  it('should fail when latitude is missing', async () => {
    const errors = await validateDto({
      name: 'Test Stop',
      longitude: -58.3,
    });
    expect(errors.length).toBeGreaterThan(0);
    const latErrors = errors.find((e) => e.property === 'latitude');
    expect(latErrors).toBeDefined();
  });

  it('should fail when longitude is missing', async () => {
    const errors = await validateDto({
      name: 'Test Stop',
      latitude: -34.6,
    });
    expect(errors.length).toBeGreaterThan(0);
    const lngErrors = errors.find((e) => e.property === 'longitude');
    expect(lngErrors).toBeDefined();
  });
});
