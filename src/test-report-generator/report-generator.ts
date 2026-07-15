/**
 * Markdown 报告生成器
 */

import {
  TestReport,
  ReportHeader,
  TestSummary,
  FailureAnalysis,
  TestSuiteDetail,
  CoverageResult,
} from '../types/index';

export function generateMarkdownReport(report: TestReport): string {
  const sections: string[] = [];

  // 1. 报告头
  sections.push(generateHeader(report.header));

  // 2. 结果摘要
  sections.push(generateSummary(report.summary));

  // 3. 失败用例分析
  if (report.failures && report.failures.length > 0) {
    sections.push(generateFailures(report.failures));
  }

  // 4. 用例明细
  if (report.details && report.details.length > 0) {
    sections.push(generateDetails(report.details));
  }

  // 5. 覆盖率
  if (report.coverage) {
    sections.push(generateCoverage(report.coverage));
  } else {
    sections.push('## 5. 覆盖率\n\n> 未获取覆盖率数据\n');
  }

  // 6. 附录
  sections.push(generateAppendix(report.appendix));

  return sections.join('\n\n');
}

function generateHeader(header: ReportHeader): string {
  const lines: string[] = [
    '# 测试报告',
    '',
    `**项目名称**: ${header.projectName}`,
    `**生成时间**: ${header.generatedAt}`,
    `**执行命令**: \`${header.command}\``,
    `**测试框架**: ${header.framework}`,
  ];

  if (header.version) {
    lines.push(`**框架版本**: ${header.version}`);
  }

  if (header.environment) {
    lines.push(`**执行环境**: ${header.environment}`);
  }

  return lines.join('\n');
}

function generateSummary(summary: TestSummary): string {
  const statusIcon = summary.success ? '✅' : '❌';
  const lines: string[] = [
    '## 1. 结果摘要',
    '',
    `| 指标 | 数值 |`,
    `|------|------|`,
    `| 整体结论 | ${statusIcon} ${summary.success ? '通过' : '失败'} |`,
    `| 用例总数 | ${summary.total} |`,
    `| 通过数 | ${summary.passed} |`,
    `| 失败数 | ${summary.failed} |`,
    `| 跳过数 | ${summary.skipped} |`,
    `| 通过率 | ${summary.passRate.toFixed(2)}% |`,
    `| 总耗时 | ${formatDuration(summary.duration)} |`,
  ];

  return lines.join('\n');
}

function generateFailures(failures: FailureAnalysis[]): string {
  const lines: string[] = [
    '## 2. 失败用例分析',
    '',
  ];

  for (const failure of failures) {
    lines.push(`### ${failure.name}`);
    if (failure.suite) {
      lines.push(`- **测试套件**: ${failure.suite}`);
    }
    lines.push(`- **文件路径**: ${failure.file}`);
    lines.push(`- **错误信息**: `);
    lines.push(`  \`\`\``);
    lines.push(`  ${failure.error.message}`);
    lines.push(`  \`\`\``);
    
    if (failure.stackSummary) {
      lines.push(`- **堆栈摘要**: `);
      lines.push(`  \`\`\``);
      lines.push(`  ${failure.stackSummary}`);
      lines.push(`  \`\`\``);
    }
    
    if (failure.error.expected && failure.error.actual) {
      lines.push(`- **期望值**: ${failure.error.expected}`);
      lines.push(`- **实际值**: ${failure.error.actual}`);
    }
    
    lines.push('');
  }

  return lines.join('\n');
}

function generateDetails(details: TestSuiteDetail[]): string {
  const lines: string[] = [
    '## 3. 用例明细',
    '',
  ];

  // 超过 200 条时截断
  let totalCases = 0;
  const truncated = details.some(suite => {
    totalCases += suite.testCases.length;
    return totalCases > 200;
  });

  for (const suite of details) {
    lines.push(`### ${suite.name} (\`${suite.file}\`)`);
    lines.push(`> 耗时: ${formatDuration(suite.duration)}`);
    lines.push('');
    lines.push('| 用例名 | 状态 | 耗时 |');
    lines.push('|--------|------|------|');

    for (const tc of suite.testCases) {
      const statusIcon = getStatusIcon(tc.status);
      lines.push(`| ${tc.name} | ${statusIcon} | ${formatDuration(tc.duration)} |`);
    }
    lines.push('');
  }

  if (truncated) {
    lines.push(`> 注: 用例数量超过 200，已截断显示`);
  }

  return lines.join('\n');
}

function generateCoverage(coverage: CoverageResult): string {
  const lines: string[] = [
    '## 4. 覆盖率',
    '',
    '| 类型 | 覆盖率 |',
    '|------|--------|',
    `| 语句覆盖 | ${coverage.statements.toFixed(2)}% |`,
    `| 分支覆盖 | ${coverage.branches.toFixed(2)}% |`,
    `| 函数覆盖 | ${coverage.functions.toFixed(2)}% |`,
    `| 行覆盖 | ${coverage.lines.toFixed(2)}% |`,
  ];

  // 低覆盖文件清单
  if (coverage.files && coverage.files.length > 0) {
    const lowCoverageFiles = coverage.files.filter(f => f.lines < 80);
    if (lowCoverageFiles.length > 0) {
      lines.push('');
      lines.push('### 低覆盖率文件（< 80%）');
      lines.push('');
      lines.push('| 文件 | 行覆盖 |');
      lines.push('|------|--------|');
      for (const f of lowCoverageFiles) {
        lines.push(`| ${f.path} | ${f.lines.toFixed(2)}% |`);
      }
    }
  }

  return lines.join('\n');
}

function generateAppendix(appendix: { resultFiles: string[]; toolVersion: string }): string {
  const lines: string[] = [
    '## 6. 附录',
    '',
    '### 原始结果文件',
  ];

  for (const file of appendix.resultFiles) {
    lines.push(`- ${file}`);
  }

  lines.push('');
  lines.push(`### 工具版本`);
  lines.push(`- test-report-generator: ${appendix.toolVersion}`);

  return lines.join('\n');
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    passed: '✅ 通过',
    failed: '❌ 失败',
    skipped: '⏭️ 跳过',
    pending: '⏳ 待定',
  };
  return icons[status] || status;
}