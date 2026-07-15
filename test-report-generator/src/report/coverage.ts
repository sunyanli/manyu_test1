/**
 * 覆盖率数据解析器
 * 支持 Istanbul (coverage/coverage-summary.json) 和 Vitest (coverage/coverage.json) 格式
 */

import { CoverageData } from '../types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 解析覆盖率数据
 * 检测 coverage/coverage-summary.json（Istanbul 格式）和 coverage/coverage.json（Vitest 格式）
 * 如果文件不存在返回 null，标注"未获取"
 */
export function parseCoverageData(): CoverageData | null {
  // 尝试 Istanbul 格式：coverage/coverage-summary.json
  const istanbulPath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
  if (fs.existsSync(istanbulPath)) {
    try {
      const raw = fs.readFileSync(istanbulPath, 'utf-8');
      const data = JSON.parse(raw);

      // Istanbul 格式: { total: { lines: { pct }, statements: { pct }, branches: { pct }, functions: { pct } } }
      if (data && data.total) {
        const total = data.total;
        return {
          lines: total.lines?.pct ?? undefined,
          statements: total.statements?.pct ?? undefined,
          branches: total.branches?.pct ?? undefined,
          functions: total.functions?.pct ?? undefined,
        };
      }
    } catch {
      // 解析失败时继续尝试其他格式
    }
  }

  // 尝试 Vitest 格式：coverage/coverage.json
  const vitestPath = path.join(process.cwd(), 'coverage', 'coverage.json');
  if (fs.existsSync(vitestPath)) {
    try {
      const raw = fs.readFileSync(vitestPath, 'utf-8');
      const data = JSON.parse(raw);

      // Vitest 格式也使用 total 字段
      if (data && data.total) {
        const total = data.total;
        return {
          lines: total.lines?.pct ?? undefined,
          statements: total.statements?.pct ?? undefined,
          branches: total.branches?.pct ?? undefined,
          functions: total.functions?.pct ?? undefined,
        };
      }
    } catch {
      // 解析失败返回 null
    }
  }

  // 文件不存在，返回 null 标注"未获取"
  return null;
}