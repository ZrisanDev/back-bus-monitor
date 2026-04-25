import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { HttpExceptionFilter } from '../filters/http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: any;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = {
      status: mockStatus,
      statusCode: 200,
    };
    mockRequest = {
      url: '/test',
      method: 'GET',
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any;
  });

  // ── SCN-201: HttpException → standard format ────────────────────────

  it('should format NotFoundException as { statusCode, message, error, timestamp }', () => {
    const exception = new NotFoundException('Bus not found');

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Bus not found',
        error: 'Not Found',
      }),
    );

    const body = mockJson.mock.calls[0][0];
    expect(body.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  // ── SCN-202: BadRequestException → 400 with message array ───────────

  it('should format BadRequestException with array of validation messages', () => {
    const validationMessages = [
      'name should not be empty',
      'capacity must be a positive number',
    ];
    const exception = new BadRequestException(validationMessages);

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: validationMessages,
        error: 'Bad Request',
      }),
    );
  });

  // ── SCN-202 (triangulation): BadRequestException with string message ─

  it('should format BadRequestException with string message', () => {
    const exception = new BadRequestException('Invalid input');

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Invalid input',
        error: 'Bad Request',
      }),
    );
  });

  // ── SCN-201 (triangulation): different HttpException subclass ────────

  it('should format UnauthorizedException as 401', () => {
    const exception = new UnauthorizedException('Token expired');

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: 'Token expired',
        error: 'Unauthorized',
      }),
    );
  });

  // ── SCN-203: QueryFailedError → 500 sanitized ──────────────────────

  it('should sanitize TypeORM QueryFailedError to 500 with generic message', () => {
    const sqlError = new QueryFailedError(
      'SELECT * FROM buses WHERE id = $1',
      [1],
      new Error('connection refused'),
    );

    filter.catch(sqlError, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      }),
    );

    // Verify SQL details are NOT leaked
    const body = mockJson.mock.calls[0][0];
    expect(JSON.stringify(body)).not.toContain('SELECT');
    expect(JSON.stringify(body)).not.toContain('buses');
  });

  // ── SCN-204: Unknown error → 500 generic ───────────────────────────

  it('should handle unknown errors with 500 generic response', () => {
    const unknownError = new Error('Something completely unexpected');

    filter.catch(unknownError, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      }),
    );

    // Verify error details are NOT leaked
    const body = mockJson.mock.calls[0][0];
    expect(body.message).not.toContain('unexpected');
  });

  // ── SCN-204 (triangulation): non-Error thrown ───────────────────────

  it('should handle non-Error thrown values with 500 generic response', () => {
    filter.catch('string error' as unknown as Error, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      }),
    );
  });

  // ── Response always has ISO timestamp ───────────────────────────────

  it('should always include a valid ISO timestamp in every response', () => {
    const before = new Date().toISOString();

    filter.catch(new NotFoundException('Test'), mockHost);

    const after = new Date().toISOString();
    const body = mockJson.mock.calls[0][0];

    expect(new Date(body.timestamp).getTime()).toBeGreaterThanOrEqual(
      new Date(before).getTime(),
    );
    expect(new Date(body.timestamp).getTime()).toBeLessThanOrEqual(
      new Date(after).getTime(),
    );
  });
});
