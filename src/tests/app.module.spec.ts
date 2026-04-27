import { AppModule } from '../app.module';
import { DatabaseModule } from '../database/database.module';
import { HealthModule } from '../health/health.module';
import { BusesModule } from '../buses/buses.module';
import { ReportsModule } from '../reports/reports.module';
import { RoutesModule } from '../routes/routes.module';
import { StopsModule } from '../stops/stops.module';
import { RouteStopsModule } from '../route-stops/route-stops.module';
import { BusAssignmentsModule } from '../bus-assignments/bus-assignments.module';
import { SimulatorModule } from '../simulator/simulator.module';

describe('AppModule', () => {
  // ── SCN: All feature modules are registered as imports ───────────────

  it('should import all required feature modules', () => {
    const imports = Reflect.getMetadata('imports', AppModule) as any[];
    const importClasses = imports.filter((i) => typeof i === 'function');

    const requiredModules = [
      BusesModule,
      ReportsModule,
      RoutesModule,
      StopsModule,
      RouteStopsModule,
      BusAssignmentsModule,
      SimulatorModule,
    ];

    for (const RequiredModule of requiredModules) {
      expect(importClasses).toContain(RequiredModule);
    }
  });

  // ── SCN: Infrastructure modules are registered (as class or dynamic) ─

  it('should import infrastructure modules (HealthModule as class, DatabaseModule as dynamic)', () => {
    const imports = Reflect.getMetadata('imports', AppModule) as any[];
    const importClasses = imports.filter((i) => typeof i === 'function');

    // HealthModule is imported as a plain class
    expect(importClasses).toContain(HealthModule);

    // DatabaseModule.forRoot() returns a DynamicModule object — verify by module field
    const hasDatabaseModule = imports.some(
      (i: any) => i?.module === DatabaseModule,
    );
    expect(hasDatabaseModule).toBe(true);
  });

  // ── SCN: No duplicate class module imports ────────────────────────────

  it('should not have duplicate class module imports', () => {
    const imports = Reflect.getMetadata('imports', AppModule) as any[];
    const importClasses = imports.filter((i) => typeof i === 'function');
    const uniqueClasses = new Set(importClasses);

    expect(uniqueClasses.size).toBe(importClasses.length);
  });

  // ── SCN: AppModule has valid NestJS import metadata ──────────────────

  it('should have valid NestJS import metadata', () => {
    const importsMetadata = Reflect.getMetadata('imports', AppModule);

    expect(importsMetadata).toBeDefined();
    expect(Array.isArray(importsMetadata)).toBe(true);
    expect(importsMetadata.length).toBeGreaterThan(0);
  });

  // ── SCN: Total module count matches expected ─────────────────────────

  it('should have exactly 10 module imports (2 dynamic + 8 class)', () => {
    const imports = Reflect.getMetadata('imports', AppModule) as any[];

    // 2 dynamic (ConfigModule.forRoot, DatabaseModule.forRoot) + 8 class = 10 total
    // ConfigModule.forRoot({isGlobal:true}), DatabaseModule.forRoot(), HealthModule,
    // BusesModule, ReportsModule, RoutesModule, StopsModule,
    // RouteStopsModule, BusAssignmentsModule, SimulatorModule
    expect(imports).toHaveLength(10);
  });
});
