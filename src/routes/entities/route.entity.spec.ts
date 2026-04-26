import { getMetadataArgsStorage } from 'typeorm';
import { Route } from './route.entity';

describe('Route Entity', () => {
  const getTable = () =>
    getMetadataArgsStorage().tables.find((t) => t.target === Route);

  const getColumns = () =>
    getMetadataArgsStorage().columns.filter((c) => c.target === Route);

  const getColumn = (name: string) =>
    getColumns().find((c) => c.propertyName === name);

  it('should be mapped to table "routes"', () => {
    const table = getTable();
    expect(table).toBeDefined();
    expect(table!.name).toBe('routes');
  });

  it('should have id as bigint primary key', () => {
    const id = getColumn('id');
    expect(id).toBeDefined();
    expect(id!.options.type).toBe('bigint');
    expect(id!.options.primary).toBe(true);
  });

  it('should have name column as varchar(120) unique', () => {
    const name = getColumn('name');
    expect(name).toBeDefined();
    expect(name!.options.type).toBe('varchar');
    expect(name!.options.length).toBe(120);
    expect(name!.options.unique).toBe(true);
  });

  it('should have description column as text nullable', () => {
    const description = getColumn('description');
    expect(description).toBeDefined();
    expect(description!.options.type).toBe('text');
    expect(description!.options.nullable).toBe(true);
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

  it('should have exactly 5 columns', () => {
    const columns = getColumns();
    expect(columns).toHaveLength(5);
    const names = columns.map((c) => c.propertyName).sort();
    expect(names).toEqual(['created_at', 'description', 'id', 'name', 'updated_at']);
  });
});
