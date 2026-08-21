// ============================================================
// 密码工具单元测试
// ============================================================

import { hashPassword, verifyPassword, validatePasswordStrength, validateUsername } from '../../src/auth/password';

// ========== hashPassword / verifyPassword ==========

function testHashAndVerify(): void {
  const password = 'Test@1234';
  const hash = hashPassword(password);

  // 验证哈希格式
  const parts = hash.split('$');
  console.assert(parts.length === 5, '哈希应为 5 段');
  console.assert(parts[1] === 'pbkdf2-sha256', '算法标识应为 pbkdf2-sha256');
  console.assert(parseInt(parts[2], 10) > 0, '轮数应为正整数');
  console.assert(parts[3].length === 32, '盐应为 32 位十六进制');
  console.assert(parts[4].length === 128, '哈希值应为 128 位十六进制');

  // 验证正确密码
  console.assert(verifyPassword(password, hash), '正确密码应验证通过');

  // 验证错误密码
  console.assert(!verifyPassword('WrongPass1', hash), '错误密码应验证失败');
  console.assert(!verifyPassword('', hash), '空密码应验证失败');

  // 验证不同哈希不匹配
  const hash2 = hashPassword('OtherPass1');
  console.assert(!verifyPassword(password, hash2), '不同密码的哈希应不匹配');

  console.log('✅ [PASS] testHashAndVerify');
}

function testHashDeterministic(): void {
  // 每次调用应产生不同的盐和哈希
  const password = 'SamePass1';
  const h1 = hashPassword(password);
  const h2 = hashPassword(password);
  console.assert(h1 !== h2, '同一密码两次哈希应产生不同结果');
  console.assert(verifyPassword(password, h1), 'h1 应能验证');
  console.assert(verifyPassword(password, h2), 'h2 应能验证');

  console.log('✅ [PASS] testHashDeterministic');
}

function testVerifyInvalidHashFormat(): void {
  console.assert(!verifyPassword('any', 'invalid-format'), '无效格式应返回 false');
  console.assert(!verifyPassword('any', ''), '空哈希应返回 false');
  console.assert(!verifyPassword('any', '$$$$'), '异常格式应返回 false');

  console.log('✅ [PASS] testVerifyInvalidHashFormat');
}

// ========== validatePasswordStrength ==========

function testValidatePasswordStrength(): void {
  // 太短
  console.assert(!validatePasswordStrength('Ab1!').valid, '少于 8 位应无效');
  console.assert(validatePasswordStrength('Ab1!').reason?.includes('长度'), '应提示长度不足');

  // 太长
  const longPassword = 'A'.repeat(129) + 'b1!';
  console.assert(!validatePasswordStrength(longPassword).valid, '超过 128 位应无效');

  // 只有字母
  console.assert(!validatePasswordStrength('abcdefgh').valid, '纯字母应无效（仅 1 类）');

  // 只有数字
  console.assert(!validatePasswordStrength('12345678').valid, '纯数字应无效（仅 1 类）');

  // 有效：大小写+数字
  console.assert(validatePasswordStrength('Abcdefg1').valid, '大小写+数字应有效');

  // 有效：字母+特殊字符
  console.assert(validatePasswordStrength('abcdefg!').valid, '字母+特殊字符应有效');

  // 有效：大小写+数字+特殊字符
  console.assert(validatePasswordStrength('Abcdef1!').valid, '大小写+数字+特殊字符应有效');

  // 空密码
  console.assert(!validatePasswordStrength('').valid, '空密码应无效');

  console.log('✅ [PASS] testValidatePasswordStrength');
}

// ========== validateUsername ==========

function testValidateUsername(): void {
  // 太短
  console.assert(!validateUsername('ab').valid, '少于 3 位应无效');

  // 太长
  console.assert(!validateUsername('a'.repeat(33)).valid, '超过 32 位应无效');

  // 数字开头
  console.assert(!validateUsername('1user').valid, '数字开头应无效');

  // 下划线开头
  console.assert(!validateUsername('_user').valid, '下划线开头应无效');

  // 含特殊字符
  console.assert(!validateUsername('user@name').valid, '含特殊字符应无效');

  // 有效
  console.assert(validateUsername('john_doe').valid, '字母+下划线用户名应有效');
  console.assert(validateUsername('User123').valid, '字母+数字用户名应有效');
  console.assert(validateUsername('abc').valid, '3 位用户名应有效');

  // 空用户名
  console.assert(!validateUsername('').valid, '空用户名应无效');

  console.log('✅ [PASS] testValidateUsername');
}

// ========== 运行全部测试 ==========

function runAll(): void {
  console.log('--- 密码工具测试 ---');
  testHashAndVerify();
  testHashDeterministic();
  testVerifyInvalidHashFormat();
  testValidatePasswordStrength();
  testValidateUsername();
  console.log('');
  console.log('🎉 密码工具测试全部通过！');
}

runAll();