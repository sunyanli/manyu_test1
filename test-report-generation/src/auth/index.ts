// ============================================================
// 认证模块导出入口
// ============================================================

export * from './types';
export * from './password';
export { AuthService, InMemoryUserStore, UserStore } from './auth.service';
export { AuthController, CookieOptions, SECURE_COOKIE_OPTIONS } from './auth.controller';
export { RateLimiter } from './middleware/rate-limiter';