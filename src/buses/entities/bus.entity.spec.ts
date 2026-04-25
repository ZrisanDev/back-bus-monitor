import { getMetadataArgsStorage } from 'typeorm';
import { Bus } from './bus.entity';

describe('Bus Entity', () => {
  const getTable = () =>
    getMetadataArgsStorage().tables.find((t) => t.target === Bus);

  const getColumns = () =>
    getMetadataArgsStorage().columns.filter((c) => c.target === Bus);

  const getColumn = (name: string) =>
    getColumns().find((c) => c.propertyName === name);

  const getRelations = () =>
    getMetadataArgsStorage().relations.filter(
      (r: any) => r.target === Bus,
    ) as any[];

  it('should be mapped to table "buses"', () => {
    const table = getTable();
    expect(table).toBeDefined();
    expect(table!.name).toBe('buses');
  });

  it('should have id as bigint primary key', () => {
    const id = getColumn('id');
    expect(id).toBeDefined();
    expect(id!.options.type).toBe('bigint');
    expect(id!.options.primary).toBe(true);
  });

  it('should have code column as varchar(50) unique', () => {
    const code = getColumn('code');
    expect(code).toBeDefined();
    expect(code!.options.type).toBe('varchar');
    expect(code!.options.length).toBe(50);
    expect(code!.options.unique).toBe(true);
  });

  it('should have capacity column as int', () => {
    const capacity = getColumn('capacity');
    expect(capacity).toBeDefined();
    expect(capacity!.options.type).toBe('int');
  });

  it('should have a check constraint on capacity > 0', () => {
    const checks = getMetadataArgsStorage().checks.filter(
      (c) => c.target === Bus,
    );
    const capacityCheck = checks.find(
      (c) => c.expression.includes('capacity') && c.expression.includes('> 0'),
    );
    expect(capacityCheck).toBeDefined();
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

  it('should have OneToMany relation to Report entity', () => {
    const reportsRelation = getRelations().find(
      (r) => r.propertyName === 'reports',
    );
    expect(reportsRelation).toBeDefined();
    expect(reportsRelation!.relationType).toBe('one-to-many');
    expect(reportsRelation!.inverseSideProperty).toBeDefined();
  });
});
