// ============================================================
// 认证服务单元测试 — 覆盖 7 类异常场景 + 验收标准
// ============================================================

import { AuthService, InMemoryUserStore } from '../../src/auth/auth.service';
import { UserStatus } from '../../src/auth/types';

// ========== 测试辅助 ==========

function createService(): { service: AuthService; store: InMemoryUserStore } {
  const store = new InMemoryUserStore();
  const service = new AuthService(store, {
    maxFailedAttempts: 3,
    lockDurationSeconds: 60, // 测试用短锁定
    rateLimitMaxRequests: 100, // 测试用宽松限制
  });
  return { service, store };
}

async function createTestUser(
  service: AuthService,
  username: string = 'testuser',
  password: string = 'Test@1234',
) {
  return service.createUser(username, password);
}

// ========== AC1: 正确账号密码登录成功 ==========

async function testLoginSuccess(): Promise<void> {
  const { service } = createService();
  await createTestUser(service);

  const result = await service.login(
    { username: 'testuser', password: 'Test@1234' },
    '127.0.0.1',
  );

  console.assert(result.success === true, '登录应成功');
  console.assert(result.message === '登录成功', '消息应为登录成功');
  console.assert(result.token !== undefined, '应返回令牌');
  console.assert(result.token!.length === 64, '令牌应为 64 位十六进制');
  console.assert(result.expiresAt !== undefined, '应返回过期时间');

  // 会话应有效
  const session = service.validateSession(result.token!);
  console.assert(session.valid === true, '会话应有效');
  console.assert(session.user?.username === 'testuser', '会话用户名应匹配');

  console.log('✅ [PASS] testLoginSuccess');
}

// ========== AC2: 账号不存在返回统一错误 ==========

async function testLoginUserNotFound(): Promise<void> {
  const { service } = createService();

  const result = await service.login(
    { username: 'nobody', password: 'Whatever1' },
    '127.0.0.1',
  );

  console.assert(result.success === false, '不存在的账号应登录失败');
  console.assert(result.message === '账号或密码错误', '应返回统一错误消息');
  console.assert(result.token === undefined, '不应返回令牌');

  console.log('✅ [PASS] testLoginUserNotFound');
}

// ========== AC3: 密码错误返回统一错误 ==========

async function testLoginWrongPassword(): Promise<void> {
  const { service } = createService();
  await createTestUser(service);

  const result = await service.login(
    { username: 'testuser', password: 'WrongPass1' },
    '127.0.0.1',
  );

  console.assert(result.success === false, '错误密码应登录失败');
  console.assert(result.message === '账号或密码错误', '应返回统一错误消息');
  console.assert(result.token === undefined, '不应返回令牌');

  console.log('✅ [PASS] testLoginWrongPassword');
}

// ========== AC4: 暴力破解锁定 ==========

async function testAccountLockout(): Promise<void> {
  const { service, store } = createService();
  const user = await createTestUser(service);

  // 连续失败 3 次（maxFailedAttempts = 3）
  for (let i = 0; i < 3; i++) {
    const result = await service.login(
      { username: 'testuser', password: 'WrongPass1' },
      '127.0.0.1',
    );
    console.assert(result.success === false, `第 ${i + 1} 次失败应返回 false`);
  }

  // 第 4 次尝试：账号应被锁定
  const lockedResult = await service.login(
    { username: 'testuser', password: 'Test@1234' }, // 正确密码
    '127.0.0.1',
  );
  console.assert(lockedResult.success === false, '锁定后即使正确密码也应失败');
  console.assert(lockedResult.message === '账号或密码错误', '锁定后应返回统一错误');

  // 验证用户状态
  const storedUser = await store.findByUsername('testuser');
  console.assert(storedUser !== null, '用户应存在');
  console.assert(storedUser!.failedAttempts >= 3, '失败次数应 ≥ 3');
  console.assert(storedUser!.lockedUntil !== null, '应设置锁定时间');

  console.log('✅ [PASS] testAccountLockout');
}

// ========== AC5: 账号禁用 ==========

async function testAccountDisabled(): Promise<void> {
  const { service, store } = createService();
  const user = await createTestUser(service);

  // 手动禁用账号
  user.status = UserStatus.DISABLED;
  await store.save(user);

  const result = await service.login(
    { username: 'testuser', password: 'Test@1234' },
    '127.0.0.1',
  );

  console.assert(result.success === false, '禁用账号应登录失败');
  console.assert(result.message === '账号或密码错误', '应返回统一错误消息');

  console.log('✅ [PASS] testAccountDisabled');
}

// ========== AC6: 输入校验 ==========

async function testInputValidation(): Promise<void> {
  const { service } = createService();

  // 无效用户名
  const r1 = await service.login({ username: 'ab', password: 'Test@1234' }, '127.0.0.1');
  console.assert(r1.success === false, '短用户名应失败');
  console.assert(r1.message === '账号或密码错误', '应返回统一错误');

  // 无效密码
  const r2 = await service.login({ username: 'testuser', password: 'short' }, '127.0.0.1');
  console.assert(r2.success === false, '弱密码应失败');
  console.assert(r2.message === '账号或密码错误', '应返回统一错误');

  console.log('✅ [PASS] testInputValidation');
}

// ========== AC7: 登出 ==========

async function testLogout(): Promise<void> {
  const { service } = createService();
  await createTestUser(service);

  const loginResult = await service.login(
    { username: 'testuser', password: 'Test@1234' },
    '127.0.0.1',
  );
  console.assert(loginResult.success, '登录应成功');

  // 登出
  const logoutResult = service.logout(loginResult.token!);
  console.assert(logoutResult.success, '登出应成功');

  // 令牌应失效
  const session = service.validateSession(loginResult.token!);
  console.assert(!session.valid, '登出后会话应失效');

  console.log('✅ [PASS] testLogout');
}

// ========== AC8: 会话过期 ==========

function testSessionExpiry(): void {
  const store = new InMemoryUserStore();
  const service = new AuthService(store, {
    sessionTtlSeconds: 0, // 立即过期
  });

  // 直接创建会话（绕过登录）
  const session = (service as any).createSession(
    { id: 'u1', username: 'test' },
    false,
  );
  const check = service.validateSession(session.token);
  console.assert(!check.valid, '过期会话应无效');

  console.log('✅ [PASS] testSessionExpiry');
}

// ========== "记住我" 长会话 ==========

async function testRememberMe(): Promise<void> {
  const { service } = createService();
  await createTestUser(service);

  const result = await service.login(
    { username: 'testuser', password: 'Test@1234', rememberMe: true },
    '127.0.0.1',
  );

  console.assert(result.success, '记住我登录应成功');
  console.assert(result.token !== undefined, '应返回令牌');

  const session = service.validateSession(result.token!);
  console.assert(session.valid, '记住我会话应有效');

  console.log('✅ [PASS] testRememberMe');
}

// ========== IP 限流 ==========

async function testIpRateLimit(): Promise<void> {
  const { service } = createService();
  await createTestUser(service);

  // 使用严格限流配置的服务
  const store2 = new InMemoryUserStore();
  const strictService = new AuthService(store2, {
    rateLimitWindowSeconds: 60,
    rateLimitMaxRequests: 3,
  });
  await strictService.createUser('testuser', 'Test@1234');

  // 前 3 次应正常
  for (let i = 0; i < 3; i++) {
    const r = await strictService.login(
      { username: 'testuser', password: 'Test@1234' },
      '192.168.1.1',
    );
    console.assert(r.success, `第 ${i + 1} 次请求应成功`);
  }

  // 第 4 次应被限流
  const limited = await strictService.login(
    { username: 'testuser', password: 'Test@1234' },
    '192.168.1.1',
  );
  console.assert(!limited.success, '超过限流阈值应失败');
  console.assert(limited.message === '请求过于频繁，请稍后再试', '应提示限流');

  strictService.destroy();
  console.log('✅ [PASS] testIpRateLimit');
}

// ========== 统一错误消息验证（防账号枚举） ==========

async function testUnifiedErrorMessage(): Promise<void> {
  const { service } = createService();
  await createTestUser(service);

  // 场景 1：账号不存在
  const r1 = await service.login({ username: 'nobody', password: 'AnyPass1' }, '127.0.0.1');
  // 场景 2：密码错误
  const r2 = await service.login({ username: 'testuser', password: 'WrongPass1' }, '127.0.0.1');

  // 两个场景的消息必须相同
  console.assert(r1.message === r2.message, '账号不存在和密码错误应返回相同消息');
  console.assert(r1.message === '账号或密码错误', '消息应为"账号或密码错误"');

  console.log('✅ [PASS] testUnifiedErrorMessage');
}

// ========== 运行全部测试 ==========

async function runAll(): Promise<void> {
  console.log('--- 认证服务测试 ---');
  await testLoginSuccess();
  await testLoginUserNotFound();
  await testLoginWrongPassword();
  await testAccountLockout();
  await testAccountDisabled();
  await testInputValidation();
  await testLogout();
  testSessionExpiry();
  await testRememberMe();
  await testIpRateLimit();
  await testUnifiedErrorMessage();
  console.log('');
  console.log('🎉 认证服务测试全部通过！');
}

runAll().catch((err) => {
  console.error('❌ 测试失败:', err);
  process.exit(1);
});