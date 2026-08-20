# 登录认证系统设计

## 1. 架构 overview

```
Client (HTTPS)
    |
    v
Gateway / WAF  -- IP 限流
    |
    v
Auth Service  -- 登录校验、失败锁定、验证码
    |
    |-- User DB
    |-- Session Store (Redis / DB)
    |-- Audit Log Store
```

## 2. 数据模型

### 2.1 User 表
| 字段 | 说明 |
| --- | --- |
| id | 主键 |
| account | 唯一账号（邮箱 / 用户名 / 手机号） |
| password_hash | bcrypt / Argon2 哈希 |
| status | active / disabled / locked |
| failed_login_attempts | 连续失败次数 |
| locked_until | 锁定到期时间，NULL 表示未锁定 |
| created_at / updated_at | 时间戳 |

### 2.2 Session 表
| 字段 | 说明 |
| --- | --- |
| session_id | 主键或 JWT jti |
| user_id | 关联用户 |
| created_at | 创建时间 |
| expires_at | 过期时间 |
| remember_me | 是否为长期 Token |
| ip / user_agent | 可选审计信息 |

### 2.3 LoginLog 审计表
| 字段 | 说明 |
| --- | --- |
| id | 主键 |
| user_id | 已知用户 ID，未知可为 NULL |
| account | 登录账号 |
| ip | 来源 IP |
| user_agent | 可选 |
| success | 是否成功 |
| reason | 失败原因（内部记录，不对外） |
| timestamp | 时间戳 |

## 3. API 设计

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/logout` | 退出 |
| GET | `/api/auth/session` | 可选：获取当前会话信息 |

## 4. 安全设计

- **密码存储**：使用 bcrypt（cost ≥ 12）或 Argon2id；禁止明文或弱哈希。
- **恒定时间校验**：账号不存在时执行虚拟校验，避免时序攻击。
- **防枚举**：统一错误文案「账号或密码错误」。
- **失败锁定**：连续失败 5 次锁定 15 分钟；成功后重置失败计数。
- **验证码**：连续失败 3 次后要求输入验证码。
- **IP 限流**：每 IP 每分钟最多 10 次登录请求。
- **Cookie**：`HttpOnly`、`Secure`、`SameSite=Lax`（或更严格）；短有效期；`remember-me` 长期 Token 单独管理。
- **传输**：强制 HTTPS；密码仅在 TLS 通道传输。

## 5. 会话管理

- 服务端 Session 存储在 Redis 或数据库。
- 普通 Session TTL 30 分钟，活动期间滑动续期。
- `remember-me` Token 有效期 30 天，服务端持久化并支持按用户撤销。
- 登出时同时删除服务端 Session 与长期 Token，并清除客户端 Cookie。

## 6. 兼容性与扩展性

- 接口建议版本化，如 `/api/v1/auth/login`。
- 预留 MFA / SSO / 第三方登录扩展点，登录流程中保留扩展钩子。
