/**
 * 测试报告生成 Skill - 主入口
 * @module index
 */

import { TestResult, ReportOptions, SkillResult, DetectedFramework } from './types';
import { detectTestFramework } from './detector';
import { parseJestVitestJson, validateJestVitestJson } from './parsers/jest-vitest';
import { parseJUnitXml, validateJUnitXml } from './parsers/junit-xml';
import { generateMarkdownReport } from './generator/markdown';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 生成测试报告
 */
export async function generateTestReport(options: ReportOptions = {}): Promise<SkillResult> {
  try {
    const projectRoot = process.cwd();
    let testResult: TestResult;
    
    // 解析模式：指定了结果文件
    if (options.resultFile) {
      testResult = await parseExistingResult(options.resultFile);
    } 
    // 执行模式：运行测试
    else {
      const framework = await detectTestFramework(projectRoot);
      if (!framework) {
        return {
          success: false,
          errors: ['无法检测到测试框架，请手动指定 testCommand 或 resultFile']
        };
      }
      
      testResult = await executeAndParse(framework, options);
    }
    
    // 生成报告
    const reportContent = generateMarkdownReport(testResult, options);
    
    // 写入文件
    const reportPath = await saveReport(reportContent, options);
    
    // 返回结果
    const topFailures = testResult.testCases
      .filter(tc => tc.status === 'failed')
      .slice(0, 3)
      .map(tc => ({ name: tc.name, message: tc.error?.message || '未知错误' }));
    
    return {
      success: testResult.summary.failed === 0,
      reportPath,
      summary: testResult.summary,
      topFailures: topFailures.length > 0 ? topFailures : undefined
    };
    
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

async function parseExistingResult(filePath: string): Promise<TestResult> {
  const content = await fs.readFile(filePath, 'utf-8');
  
  if (validateJestVitestJson(content)) {
    return parseJestVitestJson(content);
  }
  
  if (validateJUnitXml(content)) {
    return parseJUnitXml(content);
  }
  
  throw new Error('无法解析结果文件：格式不支持或文件损坏');
}

async function executeAndParse(framework: DetectedFramework, options: ReportOptions): Promise<TestResult> {
  const { execSync } = require('child_process');
  
  const command = options.testCommand || framework.command;
  
  try {
    execSync(command, { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (error: any) {
    // 测试失败是正常情况，继续解析结果
    if (!error.stdout && !error.stderr) {
      throw new Error(`测试命令执行失败: ${error.message}`);
    }
  }
  
  // 查找结果文件
  const resultFile = await findResultFile();
  if (resultFile) {
    return parseExistingResult(resultFile);
  }
  
  throw new Error('测试执行完成但未找到结果文件');
}

async function findResultFile(): Promise<string | null> {
  const candidates = [
    'test-results.json',
    'test-report.json',
    'junit.xml',
    'test-results.xml'
  ];
  
  for (const file of candidates) {
    try {
      await fs.access(file);
      return file;
    } catch {}
  }
  
  return null;
}

async function saveReport(content: string, options: ReportOptions): Promise<string> {
  const reportsDir = options.outputPath || 'reports';
  await fs.mkdir(reportsDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `test-report-${timestamp}.md`;
  const reportPath = path.join(reportsDir, filename);
  
  await fs.writeFile(reportPath, content, 'utf-8');
  return reportPath;
}

// 导出所有公共 API
export * from './types';
export * from './detector';
export * from './parsers/jest-vitest';
export * from './parsers/junit-xml';
export * from './generator/markdown';