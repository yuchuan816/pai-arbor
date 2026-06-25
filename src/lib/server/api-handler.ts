import { NextResponse, type NextRequest } from 'next/server';

type RouteHandler = (req: NextRequest, context: any) => Promise<Response> | Response;

export function withApiHandler(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, context: any) => {
    try {
      // 执行原路由逻辑
      const response = await handler(req, context);

      return response;
    } catch (error: unknown) {
      // 统一错误日志记录
      console.error(`[API_ERROR_INTERCEPTED] [${req.method}] ${req.nextUrl.pathname}:`, error);

      const errorMessage = error instanceof Error ? error.message : '服务器内部异常';

      // 统一错误响应格式
      return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
  };
}

/**
 * 快速返回 400 错误响应
 */
export function badRequest(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

/**
 * 快速返回 200 成功响应
 */
export function successResponse(data?: any) {
  return NextResponse.json({
    success: true,
    ...(data ? { data } : {}),
  });
}
