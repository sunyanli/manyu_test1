// ============================================================
// 认证模块类型定义 — 登录认证系统
// ============================================================

/** 登录请求 */
export interface LoginRequest {
  username: string;
  password: string;
  /** "记住我" 延长会话有效期 */
  rememberMe?: boolean;
}

/** 登录响应 */
export interface LoginResponse {
  success: boolean;
  message: string;
  /** 会话令牌（仅在成功时返回） */
  token?: string;
  /** 令牌过期时间（ISO 8601） */
  expiresAt?: string;
}

/** 登出响应 */
export interface LogoutResponse {
  success: boolean;
  message: string;
}

/** 会话校验响应 */
export interface SessionResponse {
  valid: boolean;
  user?: Omit<User, 'passwordHash'>;
  expiresAt?: string;
}

/** 用户实体 */
export interface User {
  id: string;
  username: string;
  passwordHash: string;
  email?: string;
  status: UserStatus;
  /** 连续失败次数 */
  failedAttempts: number;
  /** 锁定截止时间（ISO 8601），null 表示未锁定 */
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 用户状态 */
export enum UserStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

/** 会话 */
export interface Session {
  token: string;
  userId: string;
  username: string;
  createdAt: string;
  expiresAt: string;
  /** 是否为"记住我"长会话 */
  isPersistent: boolean;
}

/** 认证配置 */
export interface AuthConfig {
  /** bcrypt 盐轮数 */
  bcryptRounds: number;
  /** 短会话有效期（秒），默认 2 小时 */
  sessionTtlSeconds: number;
  /** "记住我"长会话有效期（秒），默认 7 天 */
  persistentSessionTtlSeconds: number;
  /** 最大连续失败次数，超过后锁定 */
  maxFailedAttempts: number;
  /** 锁定持续时间（秒） */
  lockDurationSeconds: number;
  /** IP 限流：时间窗口（秒） */
  rateLimitWindowSeconds: number;
  /** IP 限流：窗口内最大请求数 */
  rateLimitMaxRequests: number;
}

/** 默认认证配置 */
export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  bcryptRounds: 12,
  sessionTtlSeconds: 2 * 60 * 60,        // 2 hours
  persistentSessionTtlSeconds: 7 * 24 * 60 * 60, // 7 days
  maxFailedAttempts: 5,
  lockDurationSeconds: 30 * 60,           // 30 minutes
  rateLimitWindowSeconds: 60,             // 1 minute
  rateLimitMaxRequests: 10,
};

/** 认证错误码 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_INPUT = 'INVALID_INPUT',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
}