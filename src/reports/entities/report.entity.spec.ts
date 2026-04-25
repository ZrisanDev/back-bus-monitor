import { getMetadataArgsStorage } from 'typeorm';
import { Report } from './report.entity';

describe('Report Entity', () => {
  const getTable = () =>
    getMetadataArgsStorage().tables.find((t) => t.target === Report);

  const getColumns = () =>
    getMetadataArgsStorage().columns.filter((c) => c.target === Report);

  const getColumn = (name: string) =>
    getColumns().find((c) => c.propertyName === name);

  const getRelations = () =>
    getMetadataArgsStorage().relations.filter(
      (r: any) => r.target === Report,
    ) as any[];

  const getIndices = () =>
    getMetadataArgsStorage().indices.filter((i) => i.target === Report);

  it('should be mapped to table "reports"', () => {
    const table = getTable();
    expect(table).toBeDefined();
    expect(table!.name).toBe('reports');
  });

  it('should have id as bigint primary key', () => {
    const id = getColumn('id');
    expect(id).toBeDefined();
    expect(id!.options.type).toBe('bigint');
    expect(id!.options.primary).toBe(true);
  });

  it('should have bus_id column as bigint', () => {
    const busId = getColumn('bus_id');
    expect(busId).toBeDefined();
    expect(busId!.options.type).toBe('bigint');
  });

  it('should have ManyToOne relation to Bus with onDelete RESTRICT', () => {
    const busRelation = getRelations().find((r) => r.propertyName === 'bus');
    expect(busRelation).toBeDefined();
    expect(busRelation!.relationType).toBe('many-to-one');
    expect(busRelation!.options.onDelete).toBe('RESTRICT');
  });

  it('should have latitude column as numeric(10,8)', () => {
    const lat = getColumn('latitude');
    expect(lat).toBeDefined();
    expect(lat!.options.type).toBe('numeric');
    expect(lat!.options.precision).toBe(10);
    expect(lat!.options.scale).toBe(8);
  });

  it('should have longitude column as numeric(11,8)', () => {
    const lon = getColumn('longitude');
    expect(lon).toBeDefined();
    expect(lon!.options.type).toBe('numeric');
    expect(lon!.options.precision).toBe(11);
    expect(lon!.options.scale).toBe(8);
  });

  it('should have passenger_count column as int with default 0', () => {
    const pc = getColumn('passenger_count');
    expect(pc).toBeDefined();
    expect(pc!.options.type).toBe('int');
    expect(pc!.options.default).toBe(0);
  });

  it('should have a check constraint on passenger_count >= 0', () => {
    const checks = getMetadataArgsStorage().checks.filter(
      (c) => c.target === Report,
    );
    const pcCheck = checks.find(
      (c) =>
        c.expression.includes('passenger_count') &&
        c.expression.includes('>= 0'),
    );
    expect(pcCheck).toBeDefined();
  });

  it('should have timestamp column as timestamptz', () => {
    const ts = getColumn('timestamp');
    expect(ts).toBeDefined();
    expect(ts!.options.type).toBe('timestamptz');
  });

  it('should have created_at column as timestamptz', () => {
    const createdAt = getColumn('created_at');
    expect(createdAt).toBeDefined();
    expect(createdAt!.options.type).toBe('timestamptz');
  });

  it('should have idx_reports_bus_id index on bus_id', () => {
    const indices = getIndices();
    const busIdIndex = indices.find((i) => i.name === 'idx_reports_bus_id');
    expect(busIdIndex).toBeDefined();
    expect(busIdIndex!.columns).toContain('bus_id');
  });

  it('should have idx_reports_timestamp index on timestamp', () => {
    const indices = getIndices();
    const tsIndex = indices.find((i) => i.name === 'idx_reports_timestamp');
    expect(tsIndex).toBeDefined();
    expect(tsIndex!.columns).toContain('timestamp');
  });
});
