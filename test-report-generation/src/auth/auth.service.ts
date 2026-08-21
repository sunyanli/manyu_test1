// ============================================================
// 认证服务 — 核心业务逻辑
// ============================================================

import * as crypto from 'crypto';
import {
  AuthConfig,
  AuthErrorCode,
  DEFAULT_AUTH_CONFIG,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  Session,
  SessionResponse,
  User,
  UserStatus,
} from './types';
import { hashPassword, verifyPassword, validatePasswordStrength, validateUsername } from './password';

/**
 * 认证服务：管理用户登录、登出、会话校验。
 * 依赖外部 UserStore 接口解耦存储层。
 */
export class AuthService {
  private config: AuthConfig;
  /** 内存会话存储（生产环境应使用 Redis） */
  private sessions: Map<string, Session> = new Map();
  /** IP 请求计数（时间窗口限流） */
  private ipRequestCounts: Map<string, { count: number; windowStart: number }> = new Map();
  /** 清理定时器 */
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(private userStore: UserStore, config?: Partial<AuthConfig>) {
    this.config = { ...DEFAULT_AUTH_CONFIG, ...config };
    // 每 5 分钟清理过期会话
    this.cleanupTimer = setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);
  }

  // ============================================================
  // 登录
  // ============================================================

  /**
   * 用户登录认证。
   * 统一返回「账号或密码错误」防止账号枚举。
   */
  async login(request: LoginRequest, clientIp: string): Promise<LoginResponse> {
    // 1. 输入校验
    const usernameCheck = validateUsername(request.username);
    if (!usernameCheck.valid) {
      return { success: false, message: '账号或密码错误' };
    }

    const passwordCheck = validatePasswordStrength(request.password);
    if (!passwordCheck.valid) {
      return { success: false, message: '账号或密码错误' };
    }

    // 2. IP 限流检查
    if (this.isRateLimited(clientIp)) {
      return { success: false, message: '请求过于频繁，请稍后再试' };
    }
    this.recordIpRequest(clientIp);

    // 3. 查找用户
    const user = await this.userStore.findByUsername(request.username);
    if (!user) {
      // 账号不存在 → 统一返回错误
      return { success: false, message: '账号或密码错误' };
    }

    // 4. 账号状态检查
    if (user.status === UserStatus.DISABLED) {
      return { success: false, message: '账号或密码错误' };
    }

    if (this.isAccountLocked(user)) {
      return { success: false, message: '账号或密码错误' };
    }

    // 5. 密码校验
    if (!verifyPassword(request.password, user.passwordHash)) {
      await this.recordFailedAttempt(user);
      return { success: false, message: '账号或密码错误' };
    }

    // 6. 认证成功：重置失败计数，创建会话
    await this.resetFailedAttempts(user);
    const session = this.createSession(user, request.rememberMe ?? false);

    return {
      success: true,
      message: '登录成功',
      token: session.token,
      expiresAt: session.expiresAt,
    };
  }

  // ============================================================
  // 登出
  // ============================================================

  /** 用户登出，销毁会话。 */
  logout(token: string): LogoutResponse {
    if (!token) {
      return { success: false, message: '令牌不能为空' };
    }

    const existed = this.sessions.delete(token);
    return {
      success: true,
      message: existed ? '已退出登录' : '会话不存在或已过期',
    };
  }

  // ============================================================
  // 会话校验
  // ============================================================

  /** 校验会话是否有效。 */
  validateSession(token: string): SessionResponse {
    if (!token) {
      return { valid: false };
    }

    const session = this.sessions.get(token);
    if (!session) {
      return { valid: false };
    }

    if (new Date(session.expiresAt) <= new Date()) {
      this.sessions.delete(token);
      return { valid: false };
    }

    return {
      valid: true,
      user: { id: session.userId, username: session.username },
      expiresAt: session.expiresAt,
    };
  }

  /** 获取会话关联的用户完整信息。 */
  async getUserFromSession(token: string): Promise<User | null> {
    const sessionCheck = this.validateSession(token);
    if (!sessionCheck.valid || !sessionCheck.user) {
      return null;
    }
    return this.userStore.findById(sessionCheck.user.id);
  }

  // ============================================================
  // 用户管理
  // ============================================================

  /** 注册用户（供内部使用，本期不暴露注册接口）。 */
  async createUser(username: string, password: string): Promise<User> {
    const passwordHash = hashPassword(password, this.config.bcryptRounds);
    const now = new Date().toISOString();
    const user: User = {
      id: crypto.randomUUID(),
      username,
      passwordHash,
      status: UserStatus.ACTIVE,
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.userStore.save(user);
    return user;
  }

  // ============================================================
  // 内部方法
  // ============================================================

  private createSession(user: User, isPersistent: boolean): Session {
    const ttl = isPersistent
      ? this.config.persistentSessionTtlSeconds
      : this.config.sessionTtlSeconds;

    const session: Session = {
      token: crypto.randomBytes(32).toString('hex'),
      userId: user.id,
      username: user.username,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
      isPersistent,
    };

    this.sessions.set(session.token, session);
    return session;
  }

  private isAccountLocked(user: User): boolean {
    if (!user.lockedUntil) return false;
    return new Date(user.lockedUntil) > new Date();
  }

  private async recordFailedAttempt(user: User): Promise<void> {
    user.failedAttempts += 1;
    user.updatedAt = new Date().toISOString();

    if (user.failedAttempts >= this.config.maxFailedAttempts) {
      user.lockedUntil = new Date(Date.now() + this.config.lockDurationSeconds * 1000).toISOString();
    }

    await this.userStore.save(user);
  }

  private async resetFailedAttempts(user: User): Promise<void> {
    user.failedAttempts = 0;
    user.lockedUntil = null;
    user.updatedAt = new Date().toISOString();
    await this.userStore.save(user);
  }

  // ============================================================
  // IP 限流
  // ============================================================

  private isRateLimited(clientIp: string): boolean {
    const record = this.ipRequestCounts.get(clientIp);
    if (!record) return false;

    const now = Date.now();
    const elapsed = (now - record.windowStart) / 1000;

    if (elapsed > this.config.rateLimitWindowSeconds) {
      // 窗口已过期，重置
      this.ipRequestCounts.delete(clientIp);
      return false;
    }

    return record.count >= this.config.rateLimitMaxRequests;
  }

  private recordIpRequest(clientIp: string): void {
    const now = Date.now();
    const record = this.ipRequestCounts.get(clientIp);

    if (!record || (now - record.windowStart) / 1000 > this.config.rateLimitWindowSeconds) {
      this.ipRequestCounts.set(clientIp, { count: 1, windowStart: now });
    } else {
      record.count += 1;
    }
  }

  // ============================================================
  // 会话清理
  // ============================================================

  private cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [token, session] of this.sessions) {
      if (new Date(session.expiresAt) <= now) {
        this.sessions.delete(token);
      }
    }
  }

  /** 停止清理定时器，释放资源。 */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.sessions.clear();
    this.ipRequestCounts.clear();
  }
}

// ============================================================
// 用户存储接口
// ============================================================

export interface UserStore {
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

/**
 * 内存用户存储实现（开发/测试用，生产环境应使用数据库）。
 */
export class InMemoryUserStore implements UserStore {
  private users: Map<string, User> = new Map();
  private byUsername: Map<string, string> = new Map(); // username -> id

  async findByUsername(username: string): Promise<User | null> {
    const id = this.byUsername.get(username);
    if (!id) return null;
    return this.users.get(id) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, { ...user });
    this.byUsername.set(user.username, user.id);
  }

  /** 测试辅助：清空所有用户。 */
  clear(): void {
    this.users.clear();
    this.byUsername.clear();
  }
}