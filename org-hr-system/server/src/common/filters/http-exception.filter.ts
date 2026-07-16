import { ExceptionFilter, Catch, ArgumentsHost, HttpException, BadRequestException } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse();
    let message: string | string[] = exception.message;
    let errors: any = null;

    // BadRequestException (ValidationPipe) 单独处理，返回结构化校验错误
    if (exception instanceof BadRequestException && typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const resp = exceptionResponse as any;
      if (Array.isArray(resp.message)) {
        message = resp.message;
        errors = resp.message;
      } else if (typeof resp.message === 'string') {
        message = resp.message;
      }
    }

    response.status(status).json({
      code: status,
      msg: message,
      errors,
      data: null,
    });
  }
}