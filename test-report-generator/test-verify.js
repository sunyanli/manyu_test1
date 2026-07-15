/**
 * 解析器验证脚本
 */

const fs = require('fs');
const path = require('path');

console.log('=== 测试报告生成器验证 ===\n');

// 验证文件存在性
const requiredFiles = [
  'parsers/jest.ts',
  'parsers/vitest.ts',
  'parsers/junit.ts',
  'generators/markdown.ts',
  'types.ts',
  'executor.ts',
  'index.ts',
  'SKILL.md'
];

console.log('1. 验证核心文件...');
let allExist = true;
requiredFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} 不存在`);
    allExist = false;
  }
});

if (!allExist) {
  console.log('\n❌ 缺少必要文件');
  process.exit(1);
}

// 验证测试固件
console.log('\n2. 验证测试固件...');
const fixtures = [
  'fixtures/jest-result.json',
  'fixtures/junit-result.xml'
];

fixtures.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf-8');
    console.log(`   ✅ ${file} (${content.length} bytes)`);
  } else {
    console.log(`   ⚠️ ${file} 不存在`);
  }
});

console.log('\n=== 验证完成 ===');
console.log('\n提示: 完整功能测试需要 TypeScript 运行环境 (ts-node 或编译后执行)');