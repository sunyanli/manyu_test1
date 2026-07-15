/**
 * Markdown 报告生成器
 * 生成标准结构的测试报告
 */

import { TestResult, TestCaseResult } from '../types';

export function generateMarkdownReport(result: TestResult, failThreshold?: number): string {
  const lines: string[] = [];
  const timestamp = new Date(result.timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  // 1. 报告头
  lines.push(`# 测试报告`);
  lines.push(``);
  lines.push(`**项目名称**: ${result.projectName}`);
  lines.push(`**生成时间**: ${timestamp}`);
  lines.push(`**测试框架**: ${result.framework}${result.frameworkVersion ? ` v${result.frameworkVersion}` : ''}`);
  lines.push(`**执行命令**: \`${result.command}\``);
  lines.push(``);
  
  // 2. 结果摘要
  lines.push(`---`);
  lines.push(``);
  lines.push(`## 📊 结果摘要`);
  lines.push(``);
  lines.push(`| 指标 | 数值 |`);
  lines.push(`|------|------|`);
  lines.push(`| 整体结论 | ${renderConclusion(result, failThreshold)} |`);
  lines.push(`| 用例总数 | ${result.total} |`);
  lines.push(`| 通过数 | ${result.passed} |`);
  lines.push(`| 失败数 | ${result.failed} |`);
  lines.push(`| 跳过数 | ${result.skipped} |`);
  lines.push(`| 待定数 | ${result.pending} |`);
  lines.push(`| 通过率 | ${result.passRate}% |`);
  lines.push(`| 总耗时 | ${formatDuration(result.duration)} |`);
  lines.push(``);
  
  // 3. 失败用例分析
  if (result.failed > 0) {
    lines.push(`---`);
    lines.push(``);
    lines.push(`## ❌ 失败用例分析`);
    lines.push(``);
    
    const failedCases: TestCaseResult[] = [];
    for (const suite of result.suites) {
      for (const tc of suite.testCases) {
        if (tc.status === 'failed') {
          failedCases.push(tc);
        }
      }
    }
    
    let idx = 1;
    for (const tc of failedCases) {
      lines.push(`### ${idx}. ${tc.name}`);
      lines.push(``);
      lines.push(`- **文件路径**: \`${tc.file}\``);
      lines.push(`- **所属套件**: ${tc.suite || 'N/A'}`);
      lines.push(`- **耗时**: ${formatDuration(tc.duration)}`);
      lines.push(``);
      if (tc.failureMessages && tc.failureMessages.length > 0) {
        lines.push(`**错误信息**:`);
        lines.push(``);
        lines.push('```');
        lines.push(tc.failureMessages[0]);
        if (tc.stackTrace) {
          lines.push(``);
          lines.push(`堆栈摘要:`);
          const stackLines = tc.stackTrace.split('\n').slice(0, 10);
          lines.push(...stackLines);
        }
        lines.push('```');
        lines.push(``);
      }
      idx++;
    }
  }
  
  // 4. 用例明细
  lines.push(`---`);
  lines.push(``);
  lines.push(`## 📋 用例明细`);
  lines.push(``);
  
  let totalCases = 0;
  for (const suite of result.suites) {
    totalCases += suite.testCases.length;
  }
  
  const truncated = totalCases > 200;
  let displayed = 0;
  
  for (const suite of result.suites) {
    if (truncated && displayed >= 200) break;
    
    lines.push(`### ${suite.name}`);
    lines.push(``);
    lines.push(`| 用例名 | 状态 | 耗时 |`);
    lines.push(`|--------|------|------|`);
    
    for (const tc of suite.testCases) {
      if (truncated && displayed >= 200) break;
      const statusIcon = tc.status === 'passed' ? '✅' : tc.status === 'failed' ? '❌' : tc.status === 'skipped' ? '⏭️' : '⏸️';
      lines.push(`| ${tc.name} | ${statusIcon} ${tc.status} | ${formatDuration(tc.duration)} |`);
      displayed++;
    }
    lines.push(``);
  }
  
  if (truncated) {
    lines.push(`> ⚠️ 用例超过 200 条，已截断显示。完整列表请查看原始结果文件。`);
    lines.push(``);
  }
  
  // 5. 覆盖率
  lines.push(`---`);
  lines.push(``);
  lines.push(`## 📈 覆盖率`);
  lines.push(``);
  
  if (result.coverage) {
    lines.push(`| 类型 | 覆盖率 |`);
    lines.push(`|------|--------|`);
    if (result.coverage.lines !== undefined) {
      lines.push(`| 行覆盖率 | ${result.coverage.lines}% |`);
    }
    if (result.coverage.statements !== undefined) {
      lines.push(`| 语句覆盖率 | ${result.coverage.statements}% |`);
    }
    if (result.coverage.branches !== undefined) {
      lines.push(`| 分支覆盖率 | ${result.coverage.branches}% |`);
    }
    if (result.coverage.functions !== undefined) {
      lines.push(`| 函数覆盖率 | ${result.coverage.functions}% |`);
    }
    lines.push(``);
    
    if (result.coverage.uncoveredFiles && result.coverage.uncoveredFiles.length > 0) {
      lines.push(`**低覆盖率文件**:`);
      lines.push(``);
      for (const file of result.coverage.uncoveredFiles) {
        lines.push(`- \`${file}\``);
      }
      lines.push(``);
    }
  } else {
    lines.push(`> 📊 覆盖率数据未获取`);
    lines.push(``);
  }
  
  // 6. 附录
  lines.push(`---`);
  lines.push(``);
  lines.push(`## 📎 附录`);
  lines.push(``);
  lines.push(`- **原始结果文件**: ${result.resultFile || 'N/A'}`);
  lines.push(`- **生成工具**: Test Report Generator v1.0.0`);
  lines.push(``);
  
  if (result.error) {
    lines.push(`---`);
    lines.push(``);
    lines.push(`## ⚠️ 错误信息`);
    lines.push(``);
    lines.push('```');
    lines.push(result.error);
    lines.push('```');
    lines.push(``);
  }
  
  lines.push(`---`);
  lines.push(``);
  lines.push(`*报告生成时间: ${timestamp}*`);
  
  return lines.join('\n');
}

function renderConclusion(result: TestResult, failThreshold?: number): string {
  if (failThreshold !== undefined && result.passRate < failThreshold) {
    return '❌ 不达标';
  }
  return result.success ? '✅ 通过' : '❌ 失败';
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  } else {
    const min = Math.floor(ms / 60000);
    const sec = ((ms % 60000) / 1000).toFixed(1);
    return `${min}m ${sec}s`;
  }
}