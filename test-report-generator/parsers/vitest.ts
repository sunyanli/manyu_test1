/**
 * Vitest JSON 解析器
 * 解析 Vitest --reporter=json 输出格式
 */

import { TestReport, TestStats, TestCaseResult, TestFileResult, ExecutionEnv, CoverageData, TestResultParser } from '../types';

interface VitestAssertionResult {
  name: string;
  fullName?: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration: number;
  error?: { message: string; stack?: string };
  suiteName?: string;
  location?: { line: number; column: number };
}

interface VitestFileResult {
  name: string;
  tests: VitestAssertionResult[];
}

interface VitestJSONOutput {
  testResults?: VitestFileResult[];
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
  numSkippedTests?: number;
  startTime?: number;
  success?: boolean;
  coverage?: {
    lines: number;
    statements: number;
    branches: number;
    functions: number;
  };
}

const parser: TestResultParser = {
  name: 'vitest',
  extensions: ['.json'],
  
  canParse(content: string, filePath: string): boolean {
    if (!filePath.endsWith('.json')) return false;
    try {
      const data = JSON.parse(content);
      return Array.isArray(data.testResults) && data.testResults[0]?.tests !== undefined;
    } catch { return false; }
  },
  
  async parse(content: string, filePath: string): Promise<TestReport> {
    let data: VitestJSONOutput;
    try {
      data = JSON.parse(content);
    } catch (e) {
      throw new Error(`解析 Vitest JSON 失败：${e instanceof Error ? e.message : '无效 JSON'}`);
    }
    
    const files: TestFileResult[] = [];
    const failures: TestCaseResult[] = [];
    
    if (data.testResults) {
      for (const fileResult of data.testResults) {
        const cases: TestCaseResult[] = fileResult.tests.map(test => {
          const caseResult: TestCaseResult = {
            name: test.fullName || test.name,
            file: fileResult.name,
            status: test.status,
            duration: test.duration || 0,
            suite: test.suiteName,
            line: test.location?.line
          };
          
          if (test.status === 'failed' && test.error) {
            caseResult.error = test.error.message || 'Unknown error';
            if (test.error.stack) {
              caseResult.stackTrace = truncateStack(test.error.stack, 500);
            }
            failures.push(caseResult);
          }
          
          return caseResult;
        });
        
        const fileStats = calculateStats(cases);
        files.push({ file: fileResult.name, cases, stats: fileStats });
      }
    }
    
    let total = data.numTotalTests || 0;
    let passed = data.numPassedTests || 0;
    let failed = data.numFailedTests || 0;
    let skipped = data.numSkippedTests || 0;
    
    if (total === 0 && files.length > 0) {
      const allCases = files.flatMap(f => f.cases);
      total = allCases.length;
      passed = allCases.filter(c => c.status === 'passed').length;
      failed = allCases.filter(c => c.status === 'failed').length;
      skipped = allCases.filter(c => c.status === 'skipped').length;
    }
    
    const summary: TestStats = {
      total,
      passed,
      failed,
      skipped,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      duration: files.reduce((sum, f) => sum + f.stats.duration, 0)
    };
    
    const coverage: CoverageData = data.coverage ? {
      lines: data.coverage.lines,
      statements: data.coverage.statements,
      branches: data.coverage.branches,
      functions: data.coverage.functions,
      available: true
    } : { available: false };
    
    const env: ExecutionEnv = {
      framework: 'Vitest',
      command: 'vitest run --reporter=json',
      timestamp: data.startTime ? new Date(data.startTime).toISOString() : new Date().toISOString()
    };
    
    return {
      version: '1.0.0',
      env,
      summary,
      files,
      failures,
      coverage,
      sourceFile: filePath,
      conclusion: data.success !== false && failed === 0 ? 'pass' : (failed > 0 ? 'fail' : 'partial')
    };
  }
};

function truncateStack(stack: string, maxLength: number): string {
  if (stack.length <= maxLength) return stack;
  const lines = stack.split('\n');
  let result = '';
  for (const line of lines) {
    if (result.length + line.length + 1 > maxLength) break;
    result += (result ? '\n' : '') + line;
  }
  return result + '\n... (截断)';
}

function calculateStats(cases: TestCaseResult[]): TestStats {
  const total = cases.length;
  const passed = cases.filter(c => c.status === 'passed').length;
  const failed = cases.filter(c => c.status === 'failed').length;
  const skipped = cases.filter(c => c.status === 'skipped').length;
  const duration = cases.reduce((sum, c) => sum + c.duration, 0);
  return { total, passed, failed, skipped, passRate: total > 0 ? Math.round((passed / total) * 100) : 0, duration };
}

export default parser;