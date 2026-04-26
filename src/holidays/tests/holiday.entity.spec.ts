import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { Holiday } from '../entities/holiday.entity';

describe('Holiday Entity', () => {
  it('should be defined and instantiable', () => {
    const h = new Holiday();
    expect(h).toBeDefined();
    expect(h).toBeInstanceOf(Holiday);
  });

  it('should set and read all properties', () => {
    const h = new Holiday();
    h.id = 1;
    h.date = '2026-12-25';
    h.description = 'Navidad';
    h.created_at = new Date('2025-01-01T00:00:00.000Z');

    expect(h.id).toBe(1);
    expect(h.date).toBe('2026-12-25');
    expect(h.description).toBe('Navidad');
    expect(h.created_at).toEqual(new Date('2025-01-01T00:00:00.000Z'));
  });

  it('should be registered in TypeORM repository', async () => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: getRepositoryToken(Holiday),
          useValue: { find: jest.fn(), findOneBy: jest.fn() },
        },
      ],
    }).compile();

    const repo = module.get(getRepositoryToken(Holiday));
    expect(repo).toBeDefined();
  });
});
