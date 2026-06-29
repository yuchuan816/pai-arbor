import { NextResponse, type NextRequest } from 'next/server';
import { AppError } from '@/lib/server/app-error';
import { logger } from '@/lib/server/logger';

type RouteHandler = (req: NextRequest, context: any) => Promise<Response> | Response;

export function withApiHandler(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, context: any) => {
    try {
      const response = await handler(req, context);

      return response;
    } catch (error: unknown) {
      if (error instanceof AppError) {
        const logPayload = {
          method: req.method,
          path: req.nextUrl.pathname,
          status: error.status,
          err: error,
        };

        if (error.status < 500) {
          logger.warn(logPayload, '[API_ERROR_INTERCEPTED]');
        } else {
          logger.error(logPayload, '[API_ERROR_INTERCEPTED]');
        }

        return NextResponse.json({ success: false, error: error.message }, { status: error.status });
      }

      logger.error(
        { method: req.method, path: req.nextUrl.pathname, err: error },
        '[API_ERROR_INTERCEPTED]',
      );

      const errorMessage = error instanceof Error ? error.message : '服务器内部异常';

      return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
  };
}

/** 抛出 400 客户端错误 */
export function badRequest(message: string): never {
  throw AppError.badRequest(message);
}

/** 抛出 404 资源不存在 */
export function notFound(message: string): never {
  throw AppError.notFound(message);
}

/** 快速返回 200 成功响应 */
export function successResponse(data?: any) {
  return NextResponse.json({
    success: true,
    ...(data ? { data } : {}),
  });
}
