/**
 * 测试报告生成器 - 主入口
 */

import * as fs from 'fs';
import * as path from 'path';
import { 
  TestResult, 
  TestResultParser, 
  ReportConfig,
  TestReportError,
  ParserError,
  FrameworkDetectionError,
  TestExecutionError
} from './types';
import { 
  detectTestFramework, 
  buildTestCommand,
  findResultFiles,
  inferFrameworkFromFile 
} from './framework-detector';
import { parseJestJson, canParseJestJson } from './jest-parser';
import { parseJUnitXml, canParseJUnitXml } from './junit-parser';
import { generateMarkdownReport } from './markdown-generator';

/**
 * 测试报告生成器
 */
export class TestReportGenerator {
  private config: ReportConfig;
  private parsers: TestResultParser[];

  constructor(config?: Partial<ReportConfig>) {
    this.config = {
      outputFormat: 'markdown',
      outputPath: 'reports/',
      coverage: 'auto',
      ...config
    };

    this.parsers = [];
  }

  /**
   * 执行模式：运行测试并生成报告
   */
  async runAndGenerate(projectRoot?: string): Promise<ReportOutput> {
    const root = projectRoot || process.cwd();

    // 1. 检测测试框架
    const framework = await detectTestFramework(root);
    
    // 2. 构建测试命令
    const testCommand = buildTestCommand(
      framework.name,
      this.config.testCommand,
      'test-results/result.json'
    );

    // 3. 执行测试
    const resultPath = await this.executeTests(testCommand, root);
    
    // 4. 解析结果
    const result = await this.parseResultFile(resultPath);
    
    // 5. 生成报告
    return this.generateReportOutput(result);
  }

  /**
   * 解析模式：解析已有结果文件
   */
  async parseAndGenerate(resultFilePath: string): Promise<ReportOutput> {
    // 检查文件是否存在
    if (!fs.existsSync(resultFilePath)) {
      throw new TestReportError(
        `结果文件不存在: ${resultFilePath}`,
        'FILE_NOT_FOUND',
        { path: resultFilePath }
      );
    }

    // 解析结果
    const result = await this.parseResultFile(resultFilePath);
    
    // 生成报告
    return this.generateReportOutput(result);
  }

  /**
   * 执行测试命令
   */
  private async executeTests(command: string, projectRoot: string): Promise<string> {
    const { exec } = require('child_process');
    
    // 确保输出目录存在
    const resultsDir = path.join(projectRoot, 'test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      exec(
        command,
        { 
          cwd: projectRoot,
          maxBuffer: 50 * 1024 * 1024 // 50MB
        },
        (error: Error | null, stdout: string, stderr: string) => {
          // 测试失败不等于命令失败
          // 查找结果文件
          const resultFile = path.join(resultsDir, 'result.json');
          
          if (fs.existsSync(resultFile)) {
            resolve(resultFile);
          } else {
            // 尝试查找其他结果文件
            findResultFiles(projectRoot)
              .then(files => {
                if (files.length > 0) {
                  resolve(files[0]);
                } else {
                  reject(new TestExecutionError(
                    '测试执行后未找到结果文件',
                    { stdout: stdout.substring(0, 500), stderr: stderr.substring(0, 500) }
                  ));
                }
              })
              .catch(() => {
                reject(new TestExecutionError(
                  '测试执行失败，未生成结果文件',
                  { error: error?.message, stderr: stderr.substring(0, 500) }
                ));
              });
          }
        }
      );
    });
  }

  /**
   * 解析结果文件
   */
  private async parseResultFile(filePath: string): Promise<TestResult> {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 尝试识别格式并解析
    if (canParseJestJson(filePath, content)) {
      return parseJestJson(content, filePath);
    }
    
    if (canParseJUnitXml(filePath, content)) {
      return parseJUnitXml(content, filePath);
    }

    // 尝试推断框架
    const framework = inferFrameworkFromFile(filePath);
    
    if (framework === 'jest') {
      try {
        return parseJestJson(content, filePath);
      } catch (e) {
        // 继续尝试其他解析器
      }
    }

    if (framework === 'junit') {
      try {
        return parseJUnitXml(content, filePath);
      } catch (e) {
        // 继续尝试其他解析器
      }
    }

    throw new ParserError(
      `无法识别结果文件格式: ${filePath}`,
      { 
        filePath,
        firstLine: content.split('\n')[0]?.substring(0, 100)
      }
    );
  }

  /**
   * 生成报告输出
   */
  private async generateReportOutput(result: TestResult): Promise<ReportOutput> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `test-report-${timestamp}.md`;
    const outputPath = path.join(this.config.outputPath, filename);

    // 确保输出目录存在
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 生成报告内容
    const content = generateMarkdownReport(result, {
      projectName: result.metadata.projectName,
      timestamp: new Date().toLocaleString('zh-CN'),
      maxTestDetails: 200,
      failThreshold: this.config.failThreshold
    });

    // 写入文件
    fs.writeFileSync(outputPath, content, 'utf-8');

    return {
      reportPath: outputPath,
      summary: {
        total: result.summary.total,
        passed: result.summary.passed,
        failed: result.summary.failed,
        passRate: result.summary.passRate,
        status: result.summary.status
      },
      topFailures: this.extractTopFailures(result, 3)
    };
  }

  /**
   * 提取关键失败信息
   */
  private extractTopFailures(result: TestResult, count: number): FailureInfo[] {
    const failures: FailureInfo[] = [];

    for (const suite of result.testSuites) {
      for (const test of suite.tests) {
        if (test.status === 'failed' && test.error) {
          failures.push({
            name: test.name,
            file: suite.filePath,
            message: test.error.message
          });
          
          if (failures.length >= count) {
            return failures;
          }
        }
      }
    }

    return failures;
  }
}

/**
 * 报告输出结果
 */
export interface ReportOutput {
  reportPath: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
    status: 'passed' | 'failed' | 'partial';
  };
  topFailures: FailureInfo[];
}

/**
 * 失败信息
 */
export interface FailureInfo {
  name: string;
  file: string;
  message: string;
}

/**
 * 便捷函数：生成测试报告
 */
export async function generateReport(config?: Partial<ReportConfig>): Promise<ReportOutput> {
  const generator = new TestReportGenerator(config);
  return generator.runAndGenerate();
}

/**
 * 便捷函数：解析已有结果生成报告
 */
export async function parseAndGenerateReport(
  resultFilePath: string,
  config?: Partial<ReportConfig>
): Promise<ReportOutput> {
  const generator = new TestReportGenerator(config);
  return generator.parseAndGenerate(resultFilePath);
}

// 导出所有类型和模块
export * from './types';
export { detectTestFramework, buildTestCommand, findResultFiles } from './framework-detector';
export { parseJestJson, canParseJestJson } from './jest-parser';
export { parseJUnitXml, canParseJUnitXml } from './junit-parser';
export { generateMarkdownReport } from './markdown-generator';