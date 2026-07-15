/**
 * 测试执行与框架自动检测
 */

import { TestReportOptions, TestReport, TestResultParser } from './types';
import jestParser from './parsers/jest';
import vitestParser from './parsers/vitest';
import junitParser from './parsers/junit';

const parsers: TestResultParser[] = [jestParser, vitestParser, junitParser];

/**
 * 检测项目使用的测试框架
 */
export async function detectTestFramework(): Promise<{ framework: string; command: string }[]> {
  const detected: { framework: string; command: string }[] = [];
  
  // 检测 Jest
  const hasJestConfig = await fileExists('jest.config.js') || 
                         await fileExists('jest.config.ts') ||
                         await fileExists('jest.config.json');
  const packageJson = await readPackageJson();
  
  if (hasJestConfig || (packageJson?.devDependencies?.jest)) {
    detected.push({ framework: 'jest', command: 'npx jest --json --outputFile=test-results.json' });
  }
  
  // 检测 Vitest
  const hasVitestConfig = await fileExists('vitest.config.ts') || 
                           await fileExists('vitest.config.js');
  if (hasVitestConfig || (packageJson?.devDependencies?.vitest)) {
    detected.push({ framework: 'vitest', command: 'npx vitest run --reporter=json --outputFile=test-results.json' });
  }
  
  // 默认：如果没检测到，假设是 Jest
  if (detected.length === 0) {
    detected.push({ framework: 'jest', command: 'npx jest --json --outputFile=test-results.json' });
  }
  
  return detected;
}

/**
 * 解析已有的测试结果文件
 */
export async function parseResultFile(filePath: string): Promise<TestReport> {
  const content = await readFile(filePath);
  
  for (const parser of parsers) {
    if (parser.canParse(content, filePath)) {
      return parser.parse(content, filePath);
    }
  }
  
  throw new Error(`无法识别的测试结果格式：${filePath}`);
}

/**
 * 执行测试并生成报告
 */
export async function runTestsAndGenerateReport(options: TestReportOptions): Promise<TestReport> {
  // 解析模式
  if (options.resultFile) {
    return parseResultFile(options.resultFile);
  }
  
  // 执行模式
  const frameworks = await detectTestFramework();
  const targetFramework = options.testCommand ? 
    frameworks.find(f => options.testCommand?.includes(f.framework)) || frameworks[0] : 
    frameworks[0];
  
  const command = options.testCommand || targetFramework.command;
  
  // 执行测试（此处为简化版，实际需要 shell 执行）
  console.log(`执行测试命令: ${command}`);
  
  // 尝试解析结果文件
  const resultFile = 'test-results.json';
  try {
    return await parseResultFile(resultFile);
  } catch (e) {
    // 如果是 JUnit XML
    const junitFile = 'test-results.xml';
    if (await fileExists(junitFile)) {
      return parseResultFile(junitFile);
    }
    throw new Error(`测试执行失败或结果文件未生成: ${e instanceof Error ? e.message : '未知错误'}`);
  }
}

// 辅助函数（占位实现）
async function fileExists(path: string): Promise<boolean> {
  try {
    const fs = await import('fs/promises');
    await fs.access(path);
    return true;
  } catch { return false; }
}

async function readFile(path: string): Promise<string> {
  const fs = await import('fs/promises');
  return fs.readFile(path, 'utf-8');
}

async function readPackageJson(): Promise<Record<string, any> | null> {
  try {
    const content = await readFile('package.json');
    return JSON.parse(content);
  } catch { return null; }
}