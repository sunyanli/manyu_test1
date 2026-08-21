// ============================================================
// IP 限流中间件 — 防暴力破解
// ============================================================

import { AuthConfig, DEFAULT_AUTH_CONFIG } from '../types';

/**
 * IP 限流器。
 * 基于滑动窗口计数，可嵌入任意 HTTP 框架中间件链。
 */
export class RateLimiter {
  private ipCounts: Map<string, { count: number; windowStart: number }> = new Map();
  private config: AuthConfig;

  constructor(config?: Partial<AuthConfig>) {
    this.config = { ...DEFAULT_AUTH_CONFIG, ...config };
  }

  /**
   * 检查 IP 是否被限流。
   * @returns true 表示触发限流，应拒绝请求。
   */
  check(clientIp: string): boolean {
    const now = Date.now();
    const record = this.ipCounts.get(clientIp);

    if (!record) {
      this.ipCounts.set(clientIp, { count: 1, windowStart: now });
      return false;
    }

    const elapsed = (now - record.windowStart) / 1000;
    if (elapsed > this.config.rateLimitWindowSeconds) {
      // 窗口过期，重置
      this.ipCounts.set(clientIp, { count: 1, windowStart: now });
      return false;
    }

    record.count += 1;
    return record.count > this.config.rateLimitMaxRequests;
  }

  /** 获取 IP 剩余可用次数。 */
  remaining(clientIp: string): number {
    const record = this.ipCounts.get(clientIp);
    if (!record) return this.config.rateLimitMaxRequests;

    const now = Date.now();
    const elapsed = (now - record.windowStart) / 1000;
    if (elapsed > this.config.rateLimitWindowSeconds) {
      return this.config.rateLimitMaxRequests;
    }

    return Math.max(0, this.config.rateLimitMaxRequests - record.count);
  }

  /** 重置指定 IP 的计数。 */
  reset(clientIp: string): void {
    this.ipCounts.delete(clientIp);
  }

  /** 清空所有计数。 */
  clear(): void {
    this.ipCounts.clear();
  }
}