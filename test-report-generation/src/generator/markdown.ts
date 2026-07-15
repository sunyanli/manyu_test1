/**
 * Markdown 报告生成器
 * @module generator/markdown
 */

import { TestResult, ReportOptions, TestSummary } from '../types';

export function generateMarkdownReport(result: TestResult, options?: ReportOptions): string {
  const projectName = options?.projectName || 'Project';
  const lines: string[] = [];
  
  // 1. 报告头
  lines.push(`# 测试报告 - ${projectName}`);
  lines.push('');
  lines.push(`**生成时间**: ${result.metadata.timestamp}`);
  lines.push(`**测试框架**: ${result.metadata.framework}`);
  lines.push(`**执行命令**: ${result.metadata.command || 'N/A'}`);
  lines.push('');
  
  // 2. 结果摘要
  lines.push('## 📊 结果摘要');
  lines.push('');
  lines.push('| 指标 | 数值 |');
  lines.push('|------|------|');
  lines.push(`| 用例总数 | ${result.summary.total} |`);
  lines.push(`| ✅ 通过 | ${result.summary.passed} |`);
  lines.push(`| ❌ 失败 | ${result.summary.failed} |`);
  lines.push(`| ⏭️ 跳过 | ${result.summary.skipped} |`);
  lines.push(`| 通过率 | ${result.summary.passRate.toFixed(2)}% |`);
  lines.push(`| 总耗时 | ${(result.summary.duration / 1000).toFixed(2)}s |`);
  lines.push('');
  
  const overallStatus = result.summary.failed === 0 ? '✅ 全部通过' : '❌ 存在失败';
  lines.push(`**整体结论**: ${overallStatus}`);
  lines.push('');
  
  // 3. 失败用例分析
  const failures = result.testCases.filter(tc => tc.status === 'failed');
  if (failures.length > 0) {
    lines.push('## ❌ 失败用例分析');
    lines.push('');
    
    for (const tc of failures.slice(0, 50)) { // 限制展示50条
      lines.push(`### ${tc.name}`);
      lines.push(`- **文件**: \`${tc.file}\``);
      lines.push(`- **错误**: ${tc.error?.message || '未知错误'}`);
      if (tc.error?.stack) {
        lines.push(`- **堆栈摘要**:`);
        lines.push('```');
        lines.push(tc.error.stack.split('\n').slice(0, 10).join('\n'));
        lines.push('```');
      }
      lines.push('');
    }
    
    if (failures.length > 50) {
      lines.push(`_...共 ${failures.length} 条失败用例，仅展示前 50 条_`);
    }
  }
  
  // 4. 用例明细
  lines.push('## 📝 用例明细');
  lines.push('');
  
  const byFile = groupByFile(result.testCases);
  let shown = 0;
  const MAX_SHOWN = 200;
  
  for (const [file, cases] of Object.entries(byFile)) {
    if (shown >= MAX_SHOWN) {
      lines.push('');
      lines.push(`_共 ${result.summary.total} 条用例，仅展示前 ${MAX_SHOWN} 条_`);
      break;
    }
    
    lines.push(`### \`${file}\``);
    lines.push('');
    
    for (const tc of cases) {
      if (shown >= MAX_SHOWN) break;
      const icon = tc.status === 'passed' ? '✅' : tc.status === 'failed' ? '❌' : '⏭️';
      lines.push(`- ${icon} ${tc.name} (${(tc.duration / 1000).toFixed(2)}s)`);
      shown++;
    }
    lines.push('');
  }
  
  // 5. 覆盖率
  lines.push('## 📈 覆盖率');
  lines.push('');
  
  if (result.coverage) {
    lines.push('| 类型 | 覆盖率 |');
    lines.push('|------|--------|');
    lines.push(`| 行覆盖率 | ${result.coverage.lines.toFixed(2)}% |`);
    lines.push(`| 语句覆盖率 | ${result.coverage.statements.toFixed(2)}% |`);
    lines.push(`| 分支覆盖率 | ${result.coverage.branches.toFixed(2)}% |`);
    lines.push(`| 函数覆盖率 | ${result.coverage.functions.toFixed(2)}% |`);
  } else {
    lines.push('_未获取覆盖率数据_');
  }
  lines.push('');
  
  // 6. 附录
  lines.push('## 📎 附录');
  lines.push('');
  lines.push(`- **原始结果文件**: ${result.metadata.resultFile || 'N/A'}`);
  lines.push(`- **生成工具版本**: test-report-generator v1.0.0`);
  
  return lines.join('\n');
}

function groupByFile(testCases: TestResult['testCases']): Record<string, TestResult['testCases']> {
  const groups: Record<string, TestResult['testCases']> = {};
  
  for (const tc of testCases) {
    const file = tc.file || 'unknown';
    if (!groups[file]) groups[file] = [];
    groups[file].push(tc);
  }
  
  return groups;
}