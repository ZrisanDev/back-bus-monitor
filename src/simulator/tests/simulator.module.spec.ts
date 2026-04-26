import { SimulatorModule } from '../simulator.module';
import { SimulatorService } from '../simulator.service';
import { SimulatorController } from '../simulator.controller';
import { KafkaProducerService } from '../kafka-producer.service';

describe('SimulatorModule', () => {
  // ── SCN: Module metadata has correct structure ────────────────────────

  it('should be defined', () => {
    expect(SimulatorModule).toBeDefined();
  });

  // ── SCN: Exports SimulatorService and KafkaProducerService ────────────

  it('should export SimulatorService and KafkaProducerService', () => {
    const exports: any[] = Reflect.getMetadata('exports', SimulatorModule) ?? [];
    const exportClasses = exports.filter((e) => typeof e === 'function');

    expect(exportClasses).toContain(SimulatorService);
    expect(exportClasses).toContain(KafkaProducerService);
  });

  // ── SCN: Registers SimulatorController ────────────────────────────────

  it('should register SimulatorController', () => {
    const controllers: any[] = Reflect.getMetadata('controllers', SimulatorModule) ?? [];

    expect(controllers).toContain(SimulatorController);
  });

  // ── SCN: Registers SimulatorService and KafkaProducerService as providers

  it('should register SimulatorService and KafkaProducerService as providers', () => {
    const providers: any[] = Reflect.getMetadata('providers', SimulatorModule) ?? [];
    const providerClasses = providers.filter((p) => typeof p === 'function');

    expect(providerClasses).toContain(SimulatorService);
    expect(providerClasses).toContain(KafkaProducerService);
  });
});
