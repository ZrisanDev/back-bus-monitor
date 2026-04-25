import { of } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { SKIP_TRANSFORM_KEY } from '../decorators/skip-transform.decorator';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor;
  let reflector: Reflector;
  let mockContext: any;
  let mockResponse: any;

  beforeEach(() => {
    reflector = new Reflector();
    interceptor = new TransformInterceptor(reflector);

    mockResponse = { statusCode: 200 };
    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
      }),
      getHandler: jest.fn().mockReturnValue(() => {}),
    } as ExecutionContext;
  });

  const createCallHandler = (data: any): CallHandler => ({
    handle: () => of(data),
  });

  // ── SCN-301: Normal response wrapped in { data, statusCode, timestamp } ──

  it('should wrap response in { data, statusCode, timestamp }', (done) => {
    const handler = createCallHandler({ id: 1, name: 'Bus 42' });
    reflector.get = jest.fn().mockReturnValue(false);

    interceptor.intercept(mockContext, handler).subscribe({
      next: (result) => {
        expect(result).toEqual(
          expect.objectContaining({
            data: { id: 1, name: 'Bus 42' },
            statusCode: 200,
          }),
        );
        expect(typeof result.timestamp).toBe('string');
        done();
      },
    });
  });

  // ── SCN-301 (triangulation): reads actual response statusCode ────────

  it('should use the actual statusCode from the HTTP response', (done) => {
    mockResponse.statusCode = 201;
    const handler = createCallHandler({ id: 2, name: 'Created' });
    reflector.get = jest.fn().mockReturnValue(false);

    interceptor.intercept(mockContext, handler).subscribe({
      next: (result) => {
        expect(result).toEqual(
          expect.objectContaining({
            data: { id: 2, name: 'Created' },
            statusCode: 201,
          }),
        );
        done();
      },
    });
  });

  // ── SCN-302: @SkipTransform() decorator bypasses wrapping ───────────

  it('should NOT wrap when @SkipTransform() metadata is true', (done) => {
    const rawData = { status: 'ok', database: 'connected' };
    const handler = createCallHandler(rawData);
    reflector.get = jest
      .fn()
      .mockReturnValue(true); // skipTransform = true

    interceptor.intercept(mockContext, handler).subscribe({
      next: (result) => {
        expect(result).toBe(rawData); // exact same reference, no wrapping
        expect(result).not.toHaveProperty('data');
        expect(result).not.toHaveProperty('statusCode');
        expect(result).not.toHaveProperty('timestamp');
        done();
      },
    });
  });

  // ── SCN-303: Null/undefined responses get wrapped correctly ─────────

  it('should wrap null response in { data: null, statusCode, timestamp }', (done) => {
    const handler = createCallHandler(null);
    reflector.get = jest.fn().mockReturnValue(false);

    interceptor.intercept(mockContext, handler).subscribe({
      next: (result) => {
        expect(result).toEqual(
          expect.objectContaining({
            data: null,
            statusCode: 200,
          }),
        );
        done();
      },
    });
  });

  // ── SCN-303 (triangulation): undefined response ─────────────────────

  it('should wrap undefined response in { data: undefined, statusCode, timestamp }', (done) => {
    const handler = createCallHandler(undefined);
    reflector.get = jest.fn().mockReturnValue(false);

    interceptor.intercept(mockContext, handler).subscribe({
      next: (result) => {
        expect(result).toEqual(
          expect.objectContaining({
            data: undefined,
            statusCode: 200,
          }),
        );
        done();
      },
    });
  });

  // ── SCN-304: timestamp is valid ISO 8601 string ─────────────────────

  it('should produce a valid ISO 8601 timestamp', (done) => {
    const before = new Date().toISOString();
    const handler = createCallHandler({ test: true });
    reflector.get = jest.fn().mockReturnValue(false);

    interceptor.intercept(mockContext, handler).subscribe({
      next: (result) => {
        const after = new Date().toISOString();

        expect(result.timestamp).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        );
        expect(new Date(result.timestamp).getTime()).toBeGreaterThanOrEqual(
          new Date(before).getTime(),
        );
        expect(new Date(result.timestamp).getTime()).toBeLessThanOrEqual(
          new Date(after).getTime(),
        );
        done();
      },
    });
  });

  // ── Reflector integration: calls with correct key and handler ────────

  it('should call reflector.get with SKIP_TRANSFORM_KEY and context handler', () => {
    const handler = createCallHandler({});
    reflector.get = jest.fn().mockReturnValue(false);

    interceptor.intercept(mockContext, handler);

    expect(reflector.get).toHaveBeenCalledWith(
      SKIP_TRANSFORM_KEY,
      mockContext.getHandler(),
    );
  });
});
