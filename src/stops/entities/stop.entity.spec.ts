import { getMetadataArgsStorage } from 'typeorm';
import { Stop } from './stop.entity';

describe('Stop Entity', () => {
  const getTable = () =>
    getMetadataArgsStorage().tables.find((t) => t.target === Stop);

  const getColumns = () =>
    getMetadataArgsStorage().columns.filter((c) => c.target === Stop);

  const getColumn = (name: string) =>
    getColumns().find((c) => c.propertyName === name);

  it('should be mapped to table "stops"', () => {
    const table = getTable();
    expect(table).toBeDefined();
    expect(table!.name).toBe('stops');
  });

  it('should have id as bigint primary key', () => {
    const id = getColumn('id');
    expect(id).toBeDefined();
    expect(id!.options.type).toBe('bigint');
    expect(id!.options.primary).toBe(true);
  });

  it('should have name column as varchar(150) unique', () => {
    const name = getColumn('name');
    expect(name).toBeDefined();
    expect(name!.options.type).toBe('varchar');
    expect(name!.options.length).toBe(150);
    expect(name!.options.unique).toBe(true);
  });

  it('should have latitude column as numeric with precision 10, scale 8', () => {
    const lat = getColumn('latitude');
    expect(lat).toBeDefined();
    expect(lat!.options.type).toBe('decimal');
    expect(lat!.options.precision).toBe(10);
    expect(lat!.options.scale).toBe(8);
  });

  it('should have longitude column as numeric with precision 11, scale 8', () => {
    const lng = getColumn('longitude');
    expect(lng).toBeDefined();
    expect(lng!.options.type).toBe('decimal');
    expect(lng!.options.precision).toBe(11);
    expect(lng!.options.scale).toBe(8);
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
    expect(names).toEqual(['created_at', 'id', 'latitude', 'longitude', 'name', 'updated_at']);
  });
});
