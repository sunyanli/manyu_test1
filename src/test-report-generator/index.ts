/**
 * 测试报告生成器 - 主入口
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  TestReportConfig,
  DEFAULT_CONFIG,
  TestResult,
  TestReport,
  TestReportError,
  ErrorCodes,
  FailureAnalysis,
  TestSuiteDetail,
} from './types/index';
import { FrameworkDetector } from './framework-detector';
import { TestExecutor } from './test-executor';
import { parseJestJson, detectJestJson } from './parsers/jest-parser';
import { parseJUnitXml, detectJUnitXml } from './parsers/junit-parser';
import { generateMarkdownReport } from './report-generator';

const VERSION = '1.0.0';

export async function generateTestReport(
  userConfig?: Partial<TestReportConfig>
): Promise<{ reportPath: string; summary: string }> {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  const detector = new FrameworkDetector();
  const projectRoot = config.projectRoot || process.cwd();

  let resultFile: string;
  let framework: string;

  try {
    // 1. 获取测试结果
    if (config.mode === 'parse' && config.resultFile) {
      // 解析模式
      resultFile = config.resultFile;
      framework = detector.inferFromFile(resultFile);
    } else {
      // 执行模式
      const executor = new TestExecutor(detector, config);
      const result = await executor.execute();
      resultFile = result.resultFile;
      framework = result.framework.framework;
    }

    // 2. 解析测试结果
    const testResult = await parseTestResult(resultFile, projectRoot, framework);

    // 3. 生成报告
    const report = buildReport(testResult, projectRoot, resultFile);
    const reportContent = generateMarkdownReport(report);

    // 4. 写入文件
    const reportPath = await writeReport(reportContent, config);
    
    // 5. 生成摘要
    const summary = generateSummaryText(report);

    return { reportPath, summary };
  } catch (error) {
    if (error instanceof TestReportError) {
      throw error;
    }
    throw new TestReportError(
      `报告生成失败: ${(error as Error).message}`,
      ErrorCodes.REPORT_GENERATION_FAILED,
      error
    );
  }
}

async function parseTestResult(
  filePath: string,
  projectRoot: string,
  framework: string
): Promise<TestResult> {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(projectRoot, filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new TestReportError(
      `测试结果文件不存在: ${absolutePath}`,
      ErrorCodes.INVALID_RESULT_FILE
    );
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');

  // 检测格式并解析
  if (detectJestJson(absolutePath, content)) {
    return parseJestJson(content, absolutePath, framework as any);
  }

  if (detectJUnitXml(absolutePath, content)) {
    return parseJUnitXml(content, absolutePath);
  }

  throw new TestReportError(
    '无法识别的测试结果格式，支持 Jest JSON、Vitest JSON 或 JUnit XML',
    ErrorCodes.RESULT_PARSE_FAILED
  );
}

function buildReport(
  testResult: TestResult,
  projectRoot: string,
  resultFile: string
): TestReport {
  const failures: FailureAnalysis[] = [];
  const details: TestSuiteDetail[] = [];

  for (const suite of testResult.suites) {
    const suiteDetails: any[] = [];
    
    for (const tc of suite.testCases) {
      if (tc.status === 'failed' && tc.error) {
        failures.push({
          name: tc.name,
          suite: tc.suite,
          file: tc.file,
          error: tc.error,
          stackSummary: tc.error.stack?.split('\n').slice(0, 5).join('\n'),
        });
      }
      suiteDetails.push({
        name: tc.name,
        status: tc.status,
        duration: tc.duration,
      });
    }

    details.push({
      name: suite.name,
      file: suite.file,
      testCases: suiteDetails,
      duration: suite.duration,
    });
  }

  return {
    header: {
      projectName: path.basename(projectRoot),
      generatedAt: new Date().toISOString(),
      command: testResult.command,
      framework: testResult.framework,
    },
    summary: testResult.summary,
    failures: failures.length > 0 ? failures : undefined,
    details,
    coverage: testResult.coverage,
    appendix: {
      resultFiles: [resultFile],
      toolVersion: VERSION,
    },
  };
}

async function writeReport(
  content: string,
  config: TestReportConfig
): Promise<string> {
  const outputDir = config.outputPath;
  
  // 确保目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);
  
  const filename = `test-report-${timestamp}.md`;
  const reportPath = path.join(outputDir, filename);
  
  fs.writeFileSync(reportPath, content, 'utf-8');
  
  return reportPath;
}

function generateSummaryText(report: TestReport): string {
  const { summary } = report;
  const lines: string[] = [
    `测试报告已生成`,
    `- 用例总数: ${summary.total}`,
    `- 通过: ${summary.passed}`,
    `- 失败: ${summary.failed}`,
    `- 通过率: ${summary.passRate.toFixed(2)}%`,
    `- 结论: ${summary.success ? '✅ 通过' : '❌ 失败'}`,
  ];

  if (report.failures && report.failures.length > 0) {
    lines.push(`\n失败用例 (前3条):`);
    const top3 = report.failures.slice(0, 3);
    for (const f of top3) {
      lines.push(`  - ${f.name}: ${f.error.message.slice(0, 100)}`);
    }
  }

  return lines.join('\n');
}

// 导出
export * from './types/index';
export { FrameworkDetector } from './framework-detector';
export { TestExecutor } from './test-executor';
export { parseJestJson, parseJUnitXml } from './parsers';
export { generateMarkdownReport } from './report-generator';