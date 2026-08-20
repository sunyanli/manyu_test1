# 登录认证功能规格

## 1. 用户故事
作为已注册用户，我希望通过账号和密码安全地登录系统，并能在合理时间内保持登录状态，也能主动退出。

## 2. 功能需求

### 2.1 登录入口
- 提供 `/login` 页面与 `/api/auth/login` 接口。
- 支持账号（邮箱 / 用户名 / 手机号，具体由项目约定）+ 密码。
- 支持「记住我」复选框。

### 2.2 输入校验
- 账号必填，格式符合项目约定。
- 密码必填，长度 ≥ 8 位，服务端必须二次校验。
- 前端只做即时格式提示，安全策略以服务端为准。

### 2.3 核心认证流程
1. 接收 `account`、`password`、`rememberMe`。
2. 查询用户；若账号不存在，仍执行一次虚拟密码校验以保证耗时与存在账号相近。
3. 使用 bcrypt / Argon2 校验真实密码哈希。
4. 生成服务端 Session（或 Token），写入 HttpOnly Cookie。
5. 记录登录审计日志，并重置失败计数。

### 2.4 登录态维持
- 普通 Session：Cookie 设置为 `HttpOnly`、`Secure`、`SameSite=Lax`（或 `Strict`），有效期 30 分钟滑动续期。
- 记住我：单独生成长期 Token，有效期 30 天，服务端持久化并绑定用户。
- 活动期间续期，避免频繁重新登录。

### 2.5 退出登录
- 提供 `/api/auth/logout` 接口与 `/logout` 页面入口。
- 清除服务端 Session / 长期 Token，将客户端 Cookie 设置为过期。

## 3. 异常与边界场景

| 场景 | 期望行为 |
| --- | --- |
| 账号不存在 | 返回「账号或密码错误」，HTTP 401 |
| 密码错误 | 返回「账号或密码错误」，HTTP 401；累加失败计数 |
| 连续失败达到阈值 | 触发锁定或要求验证码，HTTP 429 |
| 账号被禁用 | 返回「账号已被禁用」，HTTP 403 |
| 同一 IP 高频请求 | HTTP 429 Too Many Requests |
| 请求体非法 / 字段缺失 | HTTP 400 Bad Request |
| Session 过期 / 无效 | HTTP 401 Unauthorized，引导重新登录 |

## 4. 非功能需求
- **安全**：密码 bcrypt / Argon2 加盐哈希；防枚举；失败锁定；IP 限流；HTTPS 强制；Cookie 安全属性。
- **性能**：登录接口 P99 < 500ms；验证码 / 加密计算不阻塞主线程。
- **可用性**：渐进式锁定，避免误锁；错误信息不泄露账号状态。
- **兼容性**：支持现代浏览器；API 建议版本化。

## 5. 验收标准（Given/When/Then）

1. **正常登录**：Given 有效账号密码，When 调用登录，Then 返回 200 并设置 Session Cookie。
2. **错误密码**：Given 存在账号，When 输入错误密码，Then 返回「账号或密码错误」且 HTTP 401。
3. **不存在账号**：Given 不存在的账号，When 登录，Then 返回「账号或密码错误」且响应耗时与存在账号相近。
4. **暴力破解防护**：Given 连续失败 5 次，When 再次登录，Then 返回 429 并要求验证码 / 锁定账号。
5. **账号禁用**：Given 禁用状态的账号，When 登录，Then 返回「账号已被禁用」且 HTTP 403。
6. **记住我**：Given 勾选 rememberMe，When 登录成功，Then 存在长期 Cookie 且服务端生成对应 Token。
7. **退出登录**：Given 已登录用户，When 调用 logout，Then Session 失效且 Cookie 被清除。
8. **会话过期**：Given 过期 Session，When 访问受保护资源，Then 返回 401。

## 6. 接口示例

### POST /api/auth/login

**Request**
```json
{
  "account": "user@example.com",
  "password": "Secret123!",
  "rememberMe": false
}
```

**Response 200**
```json
{
  "userId": "u-123",
  "account": "user@example.com",
  "message": "登录成功"
}
```
（Session 通过 `Set-Cookie` 返回）

**Response 401 / 429**
```json
{
  "code": "AUTH_FAILED",
  "message": "账号或密码错误"
}
```

### POST /api/auth/logout

**Response 204 No Content**
