import { UnprocessableEntityException } from '@nestjs/common';
import { MaxPassengersValidator } from '../max-passengers.validator';
import { Bus } from '../../entities/bus.entity';
import { CreateReportDto } from '../../../reports/dto/create-report.dto';

describe('MaxPassengersValidator', () => {
  let validator: MaxPassengersValidator;

  // ── Helpers ────────────────────────────────────────────────────────────

  const makeBus = (overrides: Partial<Bus> = {}): Bus => ({
    id: 1,
    code: 'BUS-001',
    capacity: 40,
    created_at: new Date('2025-01-01T00:00:00.000Z'),
    updated_at: new Date('2025-01-01T00:00:00.000Z'),
    reports: [],
    ...overrides,
  });

  const makeDto = (overrides: Partial<CreateReportDto> = {}): CreateReportDto => ({
    passenger_count: 22,
    ...overrides,
  });

  beforeEach(() => {
    validator = new MaxPassengersValidator();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // validate — pass case
  // ═══════════════════════════════════════════════════════════════════════

  describe('validate', () => {
    // ── SCN: passenger_count within capacity — passes ────────────────────

    it('should not throw when passenger_count is within capacity', () => {
      const bus = makeBus({ capacity: 40 });
      const dto = makeDto({ passenger_count: 22 });

      expect(() => validator.validate(dto, bus)).not.toThrow();
    });

    // ── SCN: Triangulation — passenger_count equals capacity — passes ────

    it('should not throw when passenger_count equals capacity', () => {
      const bus = makeBus({ capacity: 40 });
      const dto = makeDto({ passenger_count: 40 });

      expect(() => validator.validate(dto, bus)).not.toThrow();
    });

    // ── SCN: Triangulation — passenger_count is zero — passes ────────────

    it('should not throw when passenger_count is zero', () => {
      const bus = makeBus({ capacity: 40 });
      const dto = makeDto({ passenger_count: 0 });

      expect(() => validator.validate(dto, bus)).not.toThrow();
    });

    // ── SCN: passenger_count exceeds capacity — throws 422 ───────────────

    it('should throw UnprocessableEntityException when passenger_count exceeds capacity', () => {
      const bus = makeBus({ capacity: 40 });
      const dto = makeDto({ passenger_count: 41 });

      expect(() => validator.validate(dto, bus)).toThrow(
        UnprocessableEntityException,
      );
    });

    // ── SCN: 422 error includes passenger count and capacity in message ──

    it('should include passenger count and capacity in error message', () => {
      const bus = makeBus({ capacity: 40 });
      const dto = makeDto({ passenger_count: 50 });

      try {
        validator.validate(dto, bus);
        fail('Expected UnprocessableEntityException');
      } catch (error) {
        expect(error).toBeInstanceOf(UnprocessableEntityException);
        expect((error as UnprocessableEntityException).getStatus()).toBe(422);
        expect((error as UnprocessableEntityException).message).toMatch(
          /cantidad de pasajeros.*50.*capacidad.*40/i,
        );
      }
    });

    // ── SCN: Triangulation — different capacity bus ──────────────────────

    it('should throw with correct values for different bus capacity', () => {
      const bus = makeBus({ capacity: 60 });
      const dto = makeDto({ passenger_count: 61 });

      try {
        validator.validate(dto, bus);
        fail('Expected UnprocessableEntityException');
      } catch (error) {
        expect(error).toBeInstanceOf(UnprocessableEntityException);
        expect((error as UnprocessableEntityException).message).toMatch(
          /cantidad de pasajeros.*61.*capacidad.*60/i,
        );
      }
    });
  });
});
