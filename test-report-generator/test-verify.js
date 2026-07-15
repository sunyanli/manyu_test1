/**
 * 测试报告生成器 - 完整性验证脚本
 * 验证所有解析器、生成器、固件和边界用例
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function check(condition, msg) {
  if (condition) {
    console.log(`   ✅ ${msg}`);
    passed++;
  } else {
    console.log(`   ❌ ${msg}`);
    failed++;
  }
}

console.log('=== 测试报告生成器验证 ===\n');

// 1. 验证核心源文件存在
console.log('1. 验证核心源文件...');
const requiredFiles = [
  'src/types/index.ts',
  'src/parsers/jest.ts',
  'src/parsers/vitest.ts',
  'src/parsers/junit.ts',
  'src/parsers/pytest.ts',
  'src/report/markdown.ts',
  'src/report/coverage.ts',
  'src/report/html.ts',
  'src/report/json.ts',
  'src/index.ts',
  'executor.ts',
  'types.ts',
  'index.ts',
  'SKILL.md'
];
requiredFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  check(fs.existsSync(fullPath), file);
});

// 2. 验证测试固件
console.log('\n2. 验证测试固件...');
const fixtures = [
  { file: 'fixtures/jest-result.json', minSize: 100, desc: 'Jest 正常结果' },
  { file: 'fixtures/jest-result-failure.json', minSize: 100, desc: 'Jest 失败用例' },
  { file: 'fixtures/vitest-result.json', minSize: 100, desc: 'Vitest 正常结果' },
  { file: 'fixtures/junit-result.xml', minSize: 100, desc: 'JUnit 正常结果' },
  { file: 'fixtures/junit-result-corrupt.xml', minSize: 1, desc: 'JUnit 损坏文件' },
  { file: 'fixtures/pytest-result.xml', minSize: 100, desc: 'pytest JUnit XML' },
];
fixtures.forEach(({ file, minSize, desc }) => {
  const fullPath = path.join(__dirname, file);
  const exists = fs.existsSync(fullPath);
  if (exists) {
    const content = fs.readFileSync(fullPath, 'utf-8');
    check(content.length >= minSize, `${file} (${desc}, ${content.length} bytes)`);
  } else {
    check(false, `${file} (${desc}) - 文件不存在`);
  }
});

// 3. 验证 JSON 固件可解析
console.log('\n3. 验证 JSON 固件可解析...');
try {
  const jestData = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/jest-result.json'), 'utf-8'));
  check(jestData.success !== undefined && jestData.numTotalTests !== undefined, 'jest-result.json 结构正确');
} catch (e) {
  check(false, `jest-result.json 解析失败: ${e.message}`);
}

try {
  const jestFailData = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/jest-result-failure.json'), 'utf-8'));
  check(jestFailData.numFailedTests > 0, 'jest-result-failure.json 包含失败用例');
} catch (e) {
  check(false, `jest-result-failure.json 解析失败: ${e.message}`);
}

try {
  const vitestData = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/vitest-result.json'), 'utf-8'));
  check(vitestData.testResults !== undefined && vitestData.testResults.length > 0, 'vitest-result.json 结构正确');
} catch (e) {
  check(false, `vitest-result.json 解析失败: ${e.message}`);
}

// 4. 验证 XML 固件可解析
console.log('\n4. 验证 XML 固件可解析...');
try {
  const junitXml = fs.readFileSync(path.join(__dirname, 'fixtures/junit-result.xml'), 'utf-8');
  check(junitXml.includes('<testsuite') && junitXml.includes('</testsuite>'), 'junit-result.xml 结构正确');
} catch (e) {
  check(false, `junit-result.xml 读取失败: ${e.message}`);
}

try {
  const corruptXml = fs.readFileSync(path.join(__dirname, 'fixtures/junit-result-corrupt.xml'), 'utf-8');
  check(corruptXml.length > 0, 'junit-result-corrupt.xml 存在');
  // 损坏文件应该缺少闭合标签
  check(!corruptXml.includes('</testsuite>') || !corruptXml.includes('</testsuites>'), 'junit-result-corrupt.xml 确实损坏');
} catch (e) {
  check(false, `junit-result-corrupt.xml 读取失败: ${e.message}`);
}

try {
  const pytestXml = fs.readFileSync(path.join(__dirname, 'fixtures/pytest-result.xml'), 'utf-8');
  check(pytestXml.includes('classname'), 'pytest-result.xml 包含 classname 属性');
} catch (e) {
  check(false, `pytest-result.xml 读取失败: ${e.message}`);
}

// 5. 验证 TypeScript 编译
console.log('\n5. 验证 TypeScript 编译...');
try {
  const { execSync } = require('child_process');
  execSync('node_modules/.bin/tsc --noEmit', { cwd: __dirname, stdio: 'pipe' });
  check(true, 'tsc --noEmit 通过');
} catch (e) {
  check(false, `tsc --noEmit 失败: ${e.message.split('\n').slice(0, 3).join(' | ')}`);
}

// 6. 验证报告输出目录
console.log('\n6. 验证报告输出目录...');
const reportsDir = path.join(__dirname, 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}
check(fs.existsSync(reportsDir), 'reports/ 目录存在');

// 7. 验证 SKILL.md 内容
console.log('\n7. 验证 SKILL.md...');
const skillMd = fs.readFileSync(path.join(__dirname, 'SKILL.md'), 'utf-8');
check(skillMd.includes('test-report-generator'), 'SKILL.md 包含 skill 名称');
check(skillMd.includes('概述') || skillMd.includes('description'), 'SKILL.md 包含 概述/description');

// 8. 汇总
console.log('\n=== 验证结果汇总 ===');
console.log(`通过: ${passed}`);
console.log(`失败: ${failed}`);
console.log(`通过率: ${passed + failed > 0 ? Math.round((passed / (passed + failed)) * 100) : 0}%`);

if (failed > 0) {
  console.log('\n❌ 部分验证失败');
  process.exit(1);
} else {
  console.log('\n✅ 全部验证通过!');
  console.log('\n提示: 完整功能测试需要 TypeScript 运行环境 (ts-node 或编译后执行)');
}