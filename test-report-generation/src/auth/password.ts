// ============================================================
// 密码工具 — bcrypt 哈希与校验
// ============================================================

import * as crypto from 'crypto';
import { DEFAULT_AUTH_CONFIG } from './types';

/**
 * 使用 bcrypt 算法对密码进行哈希。
 * 实现基于 Node.js crypto 模块的简化 bcrypt（PBKDF2-SHA256 替代），
 * 生产环境应使用 `bcrypt` 或 `argon2` npm 包。
 */
export function hashPassword(password: string, rounds: number = DEFAULT_AUTH_CONFIG.bcryptRounds): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 2 ** rounds, 64, 'sha256');
  // 格式: $pbkdf2-sha256$rounds$salt$hash
  return `$pbkdf2-sha256$${rounds}$${salt}$${hash.toString('hex')}`;
}

/**
 * 校验密码是否匹配哈希。
 * 统一返回 boolean，不泄露匹配失败原因。
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split('$');
    if (parts.length !== 5 || parts[1] !== 'pbkdf2-sha256') {
      return false;
    }
    const rounds = parseInt(parts[2], 10);
    const salt = parts[3];
    const expectedHash = parts[4];

    const hash = crypto.pbkdf2Sync(password, salt, 2 ** rounds, 64, 'sha256');
    return crypto.timingSafeEqual(hash, Buffer.from(expectedHash, 'hex'));
  } catch {
    return false;
  }
}

/**
 * 密码强度校验。
 * 规则：至少 8 位，含大小写字母 + 数字 + 特殊字符其中至少两类。
 */
export function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (!password || password.length < 8) {
    return { valid: false, reason: '密码长度不能少于 8 位' };
  }
  if (password.length > 128) {
    return { valid: false, reason: '密码长度不能超过 128 位' };
  }

  let categories = 0;
  if (/[a-z]/.test(password)) categories++;
  if (/[A-Z]/.test(password)) categories++;
  if (/[0-9]/.test(password)) categories++;
  if (/[^a-zA-Z0-9]/.test(password)) categories++;

  if (categories < 2) {
    return { valid: false, reason: '密码需包含大小写字母、数字、特殊字符中至少两类' };
  }

  return { valid: true };
}

/**
 * 用户名格式校验。
 * 规则：3-32 位，字母开头，仅含字母数字下划线。
 */
export function validateUsername(username: string): { valid: boolean; reason?: string } {
  if (!username || username.length < 3) {
    return { valid: false, reason: '用户名长度不能少于 3 位' };
  }
  if (username.length > 32) {
    return { valid: false, reason: '用户名长度不能超过 32 位' };
  }
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(username)) {
    return { valid: false, reason: '用户名必须以字母开头，仅含字母、数字、下划线' };
  }
  return { valid: true };
}