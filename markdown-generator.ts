/**
 * Markdown 报告生成器
 */

import { 
  TestResult, 
  TestSuite, 
  TestCase,
  TestSummary,
  CoverageData,
  GeneratorOptions 
} from './types';

/**
 * 生成 Markdown 测试报告
 */
export function generateMarkdownReport(
  result: TestResult, 
  options: GeneratorOptions
): string {
  const sections: string[] = [];

  // 1. 报告头
  sections.push(generateHeader(result, options));

  // 2. 结果摘要
  sections.push(generateSummarySection(result.summary, options));

  // 3. 失败用例分析
  if (result.summary.failed > 0) {
    sections.push(generateFailuresSection(result.testSuites));
  }

  // 4. 用例明细
  sections.push(generateDetailsSection(result.testSuites, options));

  // 5. 覆盖率
  if (result.coverage) {
    sections.push(generateCoverageSection(result.coverage));
  } else {
    sections.push(generateCoveragePlaceholder());
  }

  // 6. 附录
  sections.push(generateAppendix(result.metadata, options));

  return sections.join('\n\n');
}

/**
 * 生成报告头
 */
function generateHeader(result: TestResult, options: GeneratorOptions): string {
  const lines: string[] = [];
  
  lines.push(`# 测试报告 - ${options.projectName || '项目'}`);
  lines.push('');
  lines.push(`**生成时间**: ${options.timestamp}`);
  
  if (result.metadata.command) {
    lines.push(`**执行命令**: \`${result.metadata.command}\``);
  }
  
  if (result.metadata.framework) {
    const frameworkInfo = result.metadata.frameworkVersion 
      ? `${result.metadata.framework} ${result.metadata.frameworkVersion}`
      : result.metadata.framework;
    lines.push(`**测试框架**: ${frameworkInfo}`);
  }

  return lines.join('\n');
}

/**
 * 生成结果摘要章节
 */
function generateSummarySection(summary: TestSummary, options: GeneratorOptions): string {
  const lines: string[] = [];
  
  lines.push('---');
  lines.push('');
  lines.push('## 📊 结果摘要');
  lines.push('');
  lines.push('| 指标 | 数值 |');
  lines.push('|------|------|');
  lines.push(`| 用例总数 | ${summary.total} |`);
  lines.push(`| ✅ 通过 | ${summary.passed} |`);
  lines.push(`| ❌ 失败 | ${summary.failed} |`);
  lines.push(`| ⏭️ 跳过 | ${summary.skipped} |`);
  lines.push(`| 通过率 | ${summary.passRate.toFixed(1)}% |`);
  lines.push(`| 总耗时 | ${formatDuration(summary.duration)} |`);
  lines.push('');
  
  // 整体结论
  let conclusion: string;
  if (summary.status === 'passed') {
    conclusion = '✅ 全部通过';
  } else if (summary.status === 'failed') {
    conclusion = '❌ 存在失败';
  } else {
    conclusion = '⚠️ 部分失败';
  }
  
  lines.push(`**整体结论**: ${conclusion}`);
  
  // 阈值检查
  if (options.failThreshold !== undefined && summary.passRate < options.failThreshold) {
    lines.push('');
    lines.push(`> ⚠️ **警告**: 通过率 ${summary.passRate.toFixed(1)}% 低于阈值 ${options.failThreshold}%`);
  }

  return lines.join('\n');
}

/**
 * 生成失败用例分析章节
 */
function generateFailuresSection(testSuites: TestSuite[]): string {
  const lines: string[] = [];
  
  lines.push('---');
  lines.push('');
  lines.push('## ❌ 失败用例分析');
  lines.push('');

  let failureIndex = 0;
  
  for (const suite of testSuites) {
    for (const test of suite.tests) {
      if (test.status === 'failed' && test.error) {
        failureIndex++;
        lines.push(generateFailureEntry(failureIndex, test, suite));
      }
    }
  }

  return lines.join('\n');
}

/**
 * 生成单个失败用例条目
 */
function generateFailureEntry(index: number, test: TestCase, suite: TestSuite): string {
  const lines: string[] = [];
  const error = test.error!;
  
  lines.push(`### ${index}. ${escapeMarkdown(test.name)}`);
  lines.push(`- **文件**: \`${suite.filePath}\``);
  
  if (error.message) {
    lines.push(`- **错误**: \`${truncateText(error.message, 200)}\``);
  }
  
  if (error.expected && error.received) {
    lines.push(`- **期望**: \`${truncateText(error.expected, 100)}\``);
    lines.push(`- **实际**: \`${truncateText(error.received, 100)}\``);
  }
  
  if (error.stack) {
    lines.push(`- **堆栈**:`);
    lines.push('```');
    lines.push(truncateText(error.stack, 500));
    lines.push('```');
  }
  
  lines.push('');

  return lines.join('\n');
}

/**
 * 生成用例明细章节
 */
function generateDetailsSection(testSuites: TestSuite[], options: GeneratorOptions): string {
  const lines: string[] = [];
  
  lines.push('---');
  lines.push('');
  lines.push('## 📝 用例明细');
  lines.push('');

  const totalTests = testSuites.reduce((sum, suite) => sum + suite.tests.length, 0);
  const maxDetails = options.maxTestDetails || 200;

  if (totalTests > maxDetails) {
    lines.push(`> 共 ${totalTests} 个用例，以下展示前 ${maxDetails} 个`);
    lines.push('');
  }

  let displayedCount = 0;
  
  for (const suite of testSuites) {
    lines.push(`### ${escapeMarkdown(suite.name)}`);
    lines.push(`- **文件**: \`${suite.filePath}\``);
    lines.push(`- **耗时**: ${formatDuration(suite.duration)}`);
    lines.push('');
    lines.push('| 用例名 | 状态 | 耗时 |');
    lines.push('|--------|------|------|');

    for (const test of suite.tests) {
      if (displayedCount >= maxDetails) break;
      
      const statusIcon = getStatusIcon(test.status);
      const duration = formatDuration(test.duration);
      lines.push(`| ${escapeMarkdown(test.name)} | ${statusIcon} | ${duration} |`);
      
      displayedCount++;
    }
    
    lines.push('');

    if (displayedCount >= maxDetails) break;
  }

  return lines.join('\n');
}

/**
 * 生成覆盖率章节
 */
function generateCoverageSection(coverage: CoverageData): string {
  const lines: string[] = [];
  
  lines.push('---');
  lines.push('');
  lines.push('## 📈 覆盖率');
  lines.push('');
  lines.push('| 类型 | 覆盖率 |');
  lines.push('|------|--------|');
  lines.push(`| 语句 | ${coverage.statements.percentage.toFixed(1)}% |`);
  lines.push(`| 分支 | ${coverage.branches.percentage.toFixed(1)}% |`);
  lines.push(`| 函数 | ${coverage.functions.percentage.toFixed(1)}% |`);
  lines.push(`| 行 | ${coverage.lines.percentage.toFixed(1)}% |`);
  lines.push('');

  // 低于阈值的文件列表
  if (coverage.files && coverage.files.length > 0) {
    const lowCoverageFiles = coverage.files
      .filter(f => f.lines < 80)
      .sort((a, b) => a.lines - b.lines)
      .slice(0, 10);

    if (lowCoverageFiles.length > 0) {
      lines.push('### ⚠️ 低覆盖率文件 (<80%)');
      lines.push('');
      lines.push('| 文件 | 行覆盖率 |');
      lines.push('|------|---------|');
      
      for (const file of lowCoverageFiles) {
        lines.push(`| \`${truncateText(file.path, 60)}\` | ${file.lines.toFixed(1)}% |`);
      }
      
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * 生成覆盖率占位符
 */
function generateCoveragePlaceholder(): string {
  return [
    '---',
    '',
    '## 📈 覆盖率',
    '',
    '> 未获取覆盖率数据',
    ''
  ].join('\n');
}

/**
 * 生成附录章节
 */
function generateAppendix(metadata: any, options: GeneratorOptions): string {
  const lines: string[] = [];
  
  lines.push('---');
  lines.push('');
  lines.push('## 📎 附录');
  lines.push('');
  lines.push('- **生成工具**: test-report-generator v1.0.0');
  
  if (metadata.command) {
    lines.push(`- **原始结果**: ${metadata.command}`);
  }
  
  if (metadata.environment) {
    if (metadata.environment.node) {
      lines.push(`- **Node 版本**: ${metadata.environment.node}`);
    }
    if (metadata.environment.platform) {
      lines.push(`- **运行平台**: ${metadata.environment.platform}`);
    }
  }

  return lines.join('\n');
}

// ========== 工具函数 ==========

/**
 * 格式化持续时间
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(1);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * 获取状态图标
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case 'passed':
      return '✅ 通过';
    case 'failed':
      return '❌ 失败';
    case 'skipped':
      return '⏭️ 跳过';
    case 'pending':
      return '⏸️ 待定';
    default:
      return status;
  }
}

/**
 * 转义 Markdown 特殊字符
 */
function escapeMarkdown(text: string): string {
  return text
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ');
}

/**
 * 截断文本
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}