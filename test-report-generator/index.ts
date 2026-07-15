/**
 * 测试报告生成 Skill - 主入口
 */

import { runTestsAndGenerateReport, parseResultFile } from './executor';
import { generateMarkdownReport } from './generators/markdown';
import { TestReportOptions } from './types';

export async function main(options: Partial<TestReportOptions> = {}): Promise<string> {
  const opts: TestReportOptions = {
    testCommand: options.testCommand,
    resultFile: options.resultFile,
    outputFormat: options.outputFormat || 'markdown',
    outputPath: options.outputPath || 'reports/',
    coverage: options.coverage || 'auto',
    failThreshold: options.failThreshold
  };
  
  try {
    const report = await runTestsAndGenerateReport(opts);
    const content = generateMarkdownReport(report);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `test-report-${timestamp}.md`;
    const filepath = `${opts.outputPath}${filename}`;
    
    const fs = await import('fs/promises');
    await fs.mkdir(opts.outputPath, { recursive: true });
    await fs.writeFile(filepath, content);
    
    const status = report.conclusion === 'pass' ? '✅ 通过' : 
                   report.conclusion === 'fail' ? '❌ 失败' : '⚠️ 部分';
    
    let result = `测试报告已生成: ${filepath}\n\n结果摘要:\n- 用例总数: ${report.summary.total}\n- 通过: ${report.summary.passed} (${report.summary.passRate}%)\n- 失败: ${report.summary.failed}\n- 跳过: ${report.summary.skipped}\n- 总耗时: ${report.summary.duration}ms\n- 整体结论: ${status}\n`;
    
    if (report.failures.length > 0) {
      result += '\n关键失败:\n' + 
        report.failures.slice(0, 3).map((f, i) => 
          `${i + 1}. [${f.file}] ${f.name}`
        ).join('\n');
    }
    
    return result;
  } catch (error) {
    return `错误: ${error instanceof Error ? error.message : '未知错误'}`;
  }
}

export { runTestsAndGenerateReport, parseResultFile, generateMarkdownReport };
export * from './types';