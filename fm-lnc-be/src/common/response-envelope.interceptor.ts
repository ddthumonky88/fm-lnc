import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseBody, resolveCorrelationId } from './api-response';
import { RAW_RESPONSE_KEY } from './raw-response.decorator';

/**
 * Bọc mọi response thành công theo envelope chuẩn và luôn trả HTTP 200 OK
 * (kể cả các API POST vốn mặc định 201 Created).
 */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const isRaw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isRaw) return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    return next.handle().pipe(
      map((payload: unknown) => {
        // Handler đã tự gửi response (vd: dùng @Res()) hoặc trả stream => giữ nguyên
        if (res.headersSent || payload instanceof StreamableFile) return payload;

        res.status(HttpStatus.OK);

        const body: ApiResponseBody = {
          status: HttpStatus.OK,
          success: true,
          message: 'OK',
          data: payload === undefined ? null : payload,
          error: null,
          timestamp: Date.now(),
          path: req.originalUrl || req.url,
          correlationId: resolveCorrelationId(req, res),
        };
        return body;
      }),
    );
  }
}
