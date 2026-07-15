/**
 * JSON 报告生成器
 * 生成 JSON 格式的测试报告伴随产物
 */

import { TestResult } from '../types';

/**
 * 生成 JSON 格式测试报告
 * 返回 JSON.stringify(result, null, 2) 格式化输出
 */
export function generateJsonReport(result: TestResult): string {
  return JSON.stringify(result, null, 2);
}