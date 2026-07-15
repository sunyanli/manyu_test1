/**
 * Markdown 报告生成器
 * 生成符合 FR2 标准结构的 Markdown 测试报告
 */

import { TestReport, TestStats, TestCaseResult, TestFileResult } from '../types';

/**
 * 生成 Markdown 测试报告
 */
export function generateMarkdownReport(report: TestReport): string {
  const lines: string[] = [];
  
  // 报告头
  lines.push('# 测试报告');
  lines.push('');
  lines.push('## 一、报告头');
  lines.push('');
  lines.push(`- **项目名称**: ${report.env.projectName || '未指定'}`);
  lines.push(`- **生成时间**: ${formatTimestamp(report.env.timestamp)}`);
  lines.push(`- **测试框架**: ${report.env.framework}${report.env.frameworkVersion ? ` v${report.env.frameworkVersion}` : ''}`);
  lines.push(`- **执行命令**: \`${report.env.command}\``);
  lines.push(`- **执行结论**: ${report.conclusion === 'pass' ? '✅ 通过' : report.conclusion === 'fail' ? '❌ 失败' : '⚠️ 部分'}`);
  lines.push('');
  
  // 结果摘要
  lines.push('## 二、结果摘要');
  lines.push('');
  lines.push('| 指标 | 数值 |');
  lines.push('|------|------|');
  lines.push(`| 用例总数 | ${report.summary.total} |`);
  lines.push(`| 通过数 | ${report.summary.passed} |`);
  lines.push(`| 失败数 | ${report.summary.failed} |`);
  lines.push(`| 跳过数 | ${report.summary.skipped} |`);
  lines.push(`| 通过率 | ${report.summary.passRate}% |`);
  lines.push(`| 总耗时 | ${formatDuration(report.summary.duration)} |`);
  lines.push(`| 整体结论 | ${report.conclusion === 'pass' ? '✅ 通过' : report.conclusion === 'fail' ? '❌ 失败' : '⚠️ 部分'} |`);
  lines.push('');
  
  // 失败用例分析
  if (report.failures.length > 0) {
    lines.push('## 三、失败用例分析');
    lines.push('');
    
    for (let i = 0; i < Math.min(report.failures.length, 10); i++) {
      const failure = report.failures[i];
      lines.push(`### 失败 ${i + 1}: ${failure.name}`);
      lines.push('');
      lines.push(`- **文件路径**: \`${failure.file}\`${failure.line ? `:${failure.line}` : ''}`);
      if (failure.suite) {
        lines.push(`- **所属套件**: ${failure.suite}`);
      }
      lines.push('');
      lines.push('**错误信息**:');
      lines.push('```');
      lines.push(failure.error || '未获取');
      lines.push('```');
      lines.push('');
      if (failure.stackTrace) {
        lines.push('**堆栈摘要**:');
        lines.push('```');
        lines.push(failure.stackTrace);
        lines.push('```');
        lines.push('');
      }
    }
    
    if (report.failures.length > 10) {
      lines.push(`> 仅展示前 10 条失败用例，共 ${report.failures.length} 条失败。`);
      lines.push('');
    }
  }
  
  // 用例明细
  lines.push('## 四、用例明细');
  lines.push('');
  
  const totalCases = report.files.reduce((sum, f) => sum + f.cases.length, 0);
  let displayedCases = 0;
  const maxCases = 200;
  
  for (const file of report.files) {
    if (displayedCases >= maxCases) break;
    
    const statusIcon = file.stats.failed > 0 ? '❌' : file.stats.passed === file.stats.total ? '✅' : '⚠️';
    lines.push(`### ${statusIcon} ${file.file}`);
    lines.push('');
    lines.push(`通过: ${file.stats.passed}/${file.stats.total} | 耗时: ${formatDuration(file.stats.duration)}`);
    lines.push('');
    
    lines.push('| 用例名 | 状态 | 耗时 |');
    lines.push('|--------|------|------|');
    
    for (const testCase of file.cases) {
      if (displayedCases >= maxCases) break;
      const statusStr = testCase.status === 'passed' ? '✅' : testCase.status === 'failed' ? '❌' : '⏭️';
      lines.push(`| ${testCase.name} | ${statusStr} | ${testCase.duration}ms |`);
      displayedCases++;
    }
    lines.push('');
  }
  
  if (totalCases > maxCases) {
    lines.push(`> 用例总数 ${totalCases} 超过 ${maxCases} 条，已截断展示。`);
    lines.push('');
  }
  
  // 覆盖率
  lines.push('## 五、覆盖率');
  lines.push('');
  
  if (report.coverage.available) {
    lines.push('| 类型 | 覆盖率 |');
    lines.push('|------|--------|');
    if (report.coverage.lines !== undefined) lines.push(`| 行覆盖率 | ${report.coverage.lines}% |`);
    if (report.coverage.statements !== undefined) lines.push(`| 语句覆盖率 | ${report.coverage.statements}% |`);
    if (report.coverage.branches !== undefined) lines.push(`| 分支覆盖率 | ${report.coverage.branches}% |`);
    if (report.coverage.functions !== undefined) lines.push(`| 函数覆盖率 | ${report.coverage.functions}% |`);
    lines.push('');
  } else {
    lines.push('**未获取**');
    lines.push('');
  }
  
  // 附录
  lines.push('## 六、附录');
  lines.push('');
  if (report.sourceFile) {
    lines.push(`- **原始结果文件**: \`${report.sourceFile}\``);
  }
  lines.push(`- **报告版本**: ${report.version}`);
  lines.push(`- **生成工具**: Test Report Generator v1.0.0`);
  lines.push('');
  
  return lines.join('\n');
}

function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  } catch {
    return isoString;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export default { generate: generateMarkdownReport, name: 'markdown', extension: 'md' };