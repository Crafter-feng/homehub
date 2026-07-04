import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * 统一错误码映射
 * HTTP Status -> 业务错误码
 */
const HTTP_TO_ERROR_CODE: Record<number, number> = {
  [HttpStatus.BAD_REQUEST]: 400,
  [HttpStatus.UNAUTHORIZED]: 401,
  [HttpStatus.FORBIDDEN]: 403,
  [HttpStatus.NOT_FOUND]: 404,
  [HttpStatus.CONFLICT]: 409,
  [HttpStatus.UNPROCESSABLE_ENTITY]: 422,
  [HttpStatus.TOO_MANY_REQUESTS]: 429,
  [HttpStatus.INTERNAL_SERVER_ERROR]: 500,
  [HttpStatus.BAD_GATEWAY]: 502,
  [HttpStatus.SERVICE_UNAVAILABLE]: 503,
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as { message?: string }).message ||
            exception.getStatus().toString();
    }

    // 使用统一的错误码格式：与成功响应的 code 字段类型一致（number）
    const code = HTTP_TO_ERROR_CODE[status] || 500;

    response.status(status).json({
      code,
      data: null,
      message,
    });
  }
}
