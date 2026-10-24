import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiResponseBody, resolveCorrelationId } from './api-response';

/**
 * Chuẩn hóa mọi lỗi theo cùng envelope:
 * { status, success: false, message, data: null, error: { code, message, validationErrors }, ... }
 * HTTP status code thật (4xx/5xx) vẫn được giữ nguyên.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') return;

    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    if (res.headersSent) return;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let validationErrors: string | null = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        message = response;
      } else if (response && typeof response === 'object') {
        const r = response as { message?: unknown; error?: unknown };
        if (Array.isArray(r.message)) {
          // Lỗi validation: message là danh sách => gom vào validationErrors
          message = typeof r.error === 'string' ? r.error : exception.message;
          validationErrors = r.message.join('; ');
        } else if (typeof r.message === 'string') {
          message = r.message;
        } else {
          message = exception.message;
        }
      }
    } else {
      this.logger.error(
        `${req.method} ${req.originalUrl || req.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiResponseBody<null> = {
      status,
      success: false,
      message,
      data: null,
      error: {
        code: HttpStatus[status] ?? `HTTP_${status}`,
        message,
        validationErrors,
      },
      timestamp: Date.now(),
      path: req.originalUrl || req.url,
      correlationId: resolveCorrelationId(req, res),
    };

    res.status(status).json(body);
  }
}
