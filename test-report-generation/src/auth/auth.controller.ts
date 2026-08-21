// ============================================================
// 认证控制器 — 框架无关的 HTTP 处理接口
// ============================================================

import { AuthService } from './auth.service';
import { RateLimiter } from './middleware/rate-limiter';
import { LoginRequest, LoginResponse, LogoutResponse, SessionResponse } from './types';

/**
 * Cookie 配置建议（供调用方设置）：
 * - HttpOnly: true（防 XSS 窃取）
 * - Secure: true（仅 HTTPS 传输）
 * - SameSite: 'Strict'（防 CSRF）
 * - Path: '/'
 */

/** Cookie 属性 */
export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
  path: string;
  maxAge?: number; // 秒
}

/** 推荐的 Cookie 安全配置 */
export const SECURE_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'Strict',
  path: '/',
};

/**
 * 认证控制器。
 * 将 AuthService 包装为框架无关的请求处理函数。
 * 适配 Express/Koa/Fastify 时只需实现薄适配层。
 */
export class AuthController {
  private rateLimiter: RateLimiter;

  constructor(private authService: AuthService) {
    this.rateLimiter = new RateLimiter();
  }

  /**
   * POST /api/auth/login
   * 处理登录请求。
   * @returns { body, cookie? } 由调用方写入 HTTP 响应。
   */
  async login(
    body: LoginRequest,
    clientIp: string,
  ): Promise<{ status: number; body: LoginResponse; cookie?: { name: string; value: string; options: CookieOptions } }> {
    // 独立限流检查
    if (this.rateLimiter.check(clientIp)) {
      return {
        status: 429,
        body: { success: false, message: '请求过于频繁，请稍后再试' },
      };
    }

    const result = await this.authService.login(body, clientIp);

    if (!result.success) {
      return { status: 401, body: result };
    }

    // 设置会话 Cookie
    const cookieOptions: CookieOptions = {
      ...SECURE_COOKIE_OPTIONS,
      maxAge: body.rememberMe ? 7 * 24 * 60 * 60 : 2 * 60 * 60,
    };

    return {
      status: 200,
      body: result,
      cookie: { name: 'session_token', value: result.token!, options: cookieOptions },
    };
  }

  /**
   * POST /api/auth/logout
   * 处理登出请求。
   */
  async logout(
    token: string | undefined,
  ): Promise<{ status: number; body: LogoutResponse; clearCookie?: { name: string; options: CookieOptions } }> {
    const result = this.authService.logout(token ?? '');

    return {
      status: 200,
      body: result,
      clearCookie: { name: 'session_token', options: SECURE_COOKIE_OPTIONS },
    };
  }

  /**
   * GET /api/auth/session
   * 校验当前会话。
   */
  async checkSession(
    token: string | undefined,
  ): Promise<{ status: number; body: SessionResponse }> {
    const result = this.authService.validateSession(token ?? '');
    return {
      status: result.valid ? 200 : 401,
      body: result,
    };
  }

  /** 获取限流器实例（供外部监控）。 */
  getRateLimiter(): RateLimiter {
    return this.rateLimiter;
  }
}