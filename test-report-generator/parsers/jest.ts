/**
 * Jest JSON 解析器
 * 解析 Jest --json 输出格式
 */

import { TestReport, TestStats, TestCaseResult, TestFileResult, ExecutionEnv, CoverageData, TestResultParser } from '../types';

interface JestAssertionResult {
  ancestorTitles: string[];
  fullName: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending' | 'todo';
  title: string;
  duration?: number;
  failureMessages?: string[];
  location?: { column: number; line: number };
}

interface JestTestResult {
  assertionResults: JestAssertionResult[];
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  message?: string;
}

interface JestJSONOutput {
  success: boolean;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  numTodoTests: number;
  startTime: number;
  testResults: JestTestResult[];
  coverageMap?: Record<string, { lines: { total: number; covered: number }; statements: { total: number; covered: number }; branches: { total: number; covered: number }; functions: { total: number; covered: number } }>;
}

const parser: TestResultParser = {
  name: 'jest',
  extensions: ['.json'],
  
  canParse(content: string, filePath: string): boolean {
    if (!filePath.endsWith('.json')) return false;
    try {
      const data = JSON.parse(content);
      return 'testResults' in data && 'numTotalTests' in data;
    } catch { return false; }
  },
  
  async parse(content: string, filePath: string): Promise<TestReport> {
    let data: JestJSONOutput;
    try {
      data = JSON.parse(content);
    } catch (e) {
      throw new Error(`解析 Jest JSON 失败：${e instanceof Error ? e.message : '无效 JSON'}`);
    }
    
    const files: TestFileResult[] = [];
    const failures: TestCaseResult[] = [];
    
    for (const result of data.testResults) {
      const cases: TestCaseResult[] = result.assertionResults.map(assertion => {
        const caseResult: TestCaseResult = {
          name: assertion.fullName,
          file: result.name,
          status: assertion.status === 'todo' ? 'pending' : assertion.status,
          duration: assertion.duration || 0,
          suite: assertion.ancestorTitles.join(' > ') || undefined,
          line: assertion.location?.line
        };
        
        if (assertion.status === 'failed' && assertion.failureMessages && assertion.failureMessages.length > 0) {
          const errorInfo = extractErrorInfo(assertion.failureMessages[0]);
          caseResult.error = errorInfo.message;
          caseResult.stackTrace = errorInfo.stack;
          failures.push(caseResult);
        }
        
        return caseResult;
      });
      
      const fileStats = calculateStats(cases);
      files.push({ file: result.name, cases, stats: fileStats });
    }
    
    const summary: TestStats = {
      total: data.numTotalTests,
      passed: data.numPassedTests,
      failed: data.numFailedTests,
      skipped: data.numPendingTests,
      passRate: data.numTotalTests > 0 ? Math.round((data.numPassedTests / data.numTotalTests) * 100) : 0,
      duration: Date.now() - data.startTime
    };
    
    const coverage = extractCoverage(data);
    
    const env: ExecutionEnv = {
      framework: 'Jest',
      command: 'jest --json',
      timestamp: new Date(data.startTime).toISOString()
    };
    
    return {
      version: '1.0.0',
      env,
      summary,
      files,
      failures,
      coverage,
      sourceFile: filePath,
      conclusion: data.success ? 'pass' : (data.numFailedTests > 0 ? 'fail' : 'partial')
    };
  }
};

function extractErrorInfo(fullMessage: string): { message: string; stack?: string } {
  const lines = fullMessage.split('\n');
  const message = lines[0] || 'Unknown error';
  const stackLines = lines.slice(1).join('\n').trim();
  const stack = stackLines ? truncateStack(stackLines, 500) : undefined;
  return { message, stack };
}

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

function extractCoverage(data: JestJSONOutput): CoverageData {
  if (!data.coverageMap) {
    return { available: false };
  }
  
  let totalLines = 0, coveredLines = 0;
  let totalStatements = 0, coveredStatements = 0;
  let totalBranches = 0, coveredBranches = 0;
  let totalFunctions = 0, coveredFunctions = 0;
  
  for (const fileCoverage of Object.values(data.coverageMap)) {
    totalLines += fileCoverage.lines.total;
    coveredLines += fileCoverage.lines.covered;
    totalStatements += fileCoverage.statements.total;
    coveredStatements += fileCoverage.statements.covered;
    totalBranches += fileCoverage.branches.total;
    coveredBranches += fileCoverage.branches.covered;
    totalFunctions += fileCoverage.functions.total;
    coveredFunctions += fileCoverage.functions.covered;
  }
  
  return {
    lines: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0,
    statements: totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 0,
    branches: totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 100) : 0,
    functions: totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 0,
    available: true
  };
}

export default parser;