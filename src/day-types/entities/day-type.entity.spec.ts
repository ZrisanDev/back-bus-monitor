import { getMetadataArgsStorage } from 'typeorm';
import { DayType } from './day-type.entity';

describe('DayType Entity', () => {
  const getTable = () =>
    getMetadataArgsStorage().tables.find((t) => t.target === DayType);

  const getColumns = () =>
    getMetadataArgsStorage().columns.filter((c) => c.target === DayType);

  const getColumn = (name: string) =>
    getColumns().find((c) => c.propertyName === name);

  it('should be mapped to table "day_types"', () => {
    const table = getTable();
    expect(table).toBeDefined();
    expect(table!.name).toBe('day_types');
  });

  it('should have id as bigint primary key', () => {
    const id = getColumn('id');
    expect(id).toBeDefined();
    expect(id!.options.type).toBe('bigint');
    expect(id!.options.primary).toBe(true);
  });

  it('should have code column as varchar(30) unique', () => {
    const code = getColumn('code');
    expect(code).toBeDefined();
    expect(code!.options.type).toBe('varchar');
    expect(code!.options.length).toBe(30);
    expect(code!.options.unique).toBe(true);
  });

  it('should have label_es column as varchar(80)', () => {
    const labelEs = getColumn('label_es');
    expect(labelEs).toBeDefined();
    expect(labelEs!.options.type).toBe('varchar');
    expect(labelEs!.options.length).toBe(80);
  });

  it('should have label_en column as varchar(80)', () => {
    const labelEn = getColumn('label_en');
    expect(labelEn).toBeDefined();
    expect(labelEn!.options.type).toBe('varchar');
    expect(labelEn!.options.length).toBe(80);
  });

  it('should have created_at column as timestamptz', () => {
    const createdAt = getColumn('created_at');
    expect(createdAt).toBeDefined();
    expect(createdAt!.options.type).toBe('timestamptz');
  });

  it('should have updated_at column as timestamptz', () => {
    const updatedAt = getColumn('updated_at');
    expect(updatedAt).toBeDefined();
    expect(updatedAt!.options.type).toBe('timestamptz');
  });

  it('should have exactly 6 columns', () => {
    const columns = getColumns();
    expect(columns).toHaveLength(6);
    const names = columns.map((c) => c.propertyName).sort();
    expect(names).toEqual(['code', 'created_at', 'id', 'label_en', 'label_es', 'updated_at']);
  });
});
