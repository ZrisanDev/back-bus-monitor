import { Reflector } from '@nestjs/core';
import { SKIP_TRANSFORM_KEY, SkipTransform } from '../decorators/skip-transform.decorator';

describe('SkipTransform Decorator', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  it('should set SKIP_TRANSFORM_KEY metadata to true on decorated method', () => {
    class TestController {
      @SkipTransform()
      healthCheck() {
        return 'ok';
      }
    }

    const controller = new TestController();
    const metadata = reflector.get(
      SKIP_TRANSFORM_KEY,
      controller.healthCheck,
    );

    expect(metadata).toBe(true);
  });

  it('should NOT have SKIP_TRANSFORM_KEY metadata on undecorated method', () => {
    class TestController {
      normalMethod() {
        return 'data';
      }
    }

    const controller = new TestController();
    const metadata = reflector.get(
      SKIP_TRANSFORM_KEY,
      controller.normalMethod,
    );

    expect(metadata).toBeUndefined();
  });

  it('should export SKIP_TRANSFORM_KEY as a string constant', () => {
    expect(typeof SKIP_TRANSFORM_KEY).toBe('string');
    expect(SKIP_TRANSFORM_KEY).toBe('skipTransform');
  });
});
