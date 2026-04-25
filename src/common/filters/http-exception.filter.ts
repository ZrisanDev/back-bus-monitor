import {
  Catch,
  ExceptionFilter,
  HttpException,
  ArgumentsHost,
  Injectable,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Response } from 'express';

@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string | string[]) || exception.message;
        error = (resp.error as string) || exception.name;
      } else {
        message = exception.message;
        error = exception.name;
      }
    } else if (exception instanceof QueryFailedError) {
      statusCode = 500;
      message = 'Internal server error';
      error = 'Internal Server Error';
    } else {
      statusCode = 500;
      message = 'Internal server error';
      error = 'Internal Server Error';
    }

    response.status(statusCode).json({
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
    });
  }
}
