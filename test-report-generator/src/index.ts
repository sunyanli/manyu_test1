/**
 * 测试报告生成器 - 主入口
 */

import { TestResult, ReportConfig, ParseResult, TestResultParser } from './types';
import { jestParser } from './parsers/jest';
import { vitestParser } from './parsers/vitest';
import { junitParser } from './parsers/junit';
import { generateMarkdownReport } from './report/markdown';

const parsers: TestResultParser[] = [jestParser, vitestParser, junitParser];

/**
 * 自动检测测试框架和执行命令
 */
export function detectTestCommand(): string {
  // 检测优先级：package.json scripts > 配置文件 > 默认
  
  // Jest 检测
  // Vitest 检测
  // pytest 检测
  
  // 默认返回常用命令
  return 'npm test';
}

/**
 * 解析测试结果文件
 */
export function parseTestResult(content: string, filePath: string): ParseResult {
  for (const parser of parsers) {
    try {
      if (parser.canParse(content, filePath)) {
        const result = parser.parse(content, filePath);
        return { success: !result.error, result, error: result.error };
      }
    } catch (error) {
      // 继续尝试下一个解析器
      continue;
    }
  }
  
  return {
    success: false,
    error: `无法识别的结果格式。支持的格式: Jest JSON, Vitest JSON, JUnit XML`
  };
}

/**
 * 生成测试报告
 */
export function generateReport(result: TestResult, config: ReportConfig): string {
  return generateMarkdownReport(result);
}

/**
 * 获取默认配置
 */
export function getDefaultConfig(): ReportConfig {
  return {
    outputFormat: 'markdown',
    outputPath: 'reports/',
    coverage: 'auto',
    executeTest: true
  };
}

// 导出所有模块
export { TestResult, ReportConfig, ParseResult, TestResultParser } from './types';
export { jestParser } from './parsers/jest';
export { vitestParser } from './parsers/vitest';
export { junitParser } from './parsers/junit';
export { generateMarkdownReport } from './report/markdown';