/**
 * Jest JSON 解析器
 * 解析 Jest --json 输出格式
 */

import { TestReport, TestStats, TestCaseResult, TestFileResult, ExecutionEnv, CoverageData, CoverageFileDetail, TestResultParser } from '../types';
import { truncateMessage, truncateStack, calculateStats } from './utils';

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
      duration: files.reduce((sum, f) => sum + f.stats.duration, 0)
    };
    
    const coverage = extractCoverage(data);
    
    const env: ExecutionEnv = {
      framework: 'Jest',
      command: 'jest --json',
      timestamp: new Date(data.startTime).toISOString()
    };
    
    return {
      version: '2.0.0',
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


function extractCoverage(data: JestJSONOutput): CoverageData {
  if (!data.coverageMap) {
    return { available: false };
  }
  
  let totalLines = 0, coveredLines = 0;
  let totalStatements = 0, coveredStatements = 0;
  let totalBranches = 0, coveredBranches = 0;
  let totalFunctions = 0, coveredFunctions = 0;
  const lowCoverageFiles: CoverageFileDetail[] = [];
  const threshold = 50; // 默认阈值 50%
  
  for (const [filePath, fileCoverage] of Object.entries(data.coverageMap)) {
    totalLines += fileCoverage.lines.total;
    coveredLines += fileCoverage.lines.covered;
    totalStatements += fileCoverage.statements.total;
    coveredStatements += fileCoverage.statements.covered;
    totalBranches += fileCoverage.branches.total;
    coveredBranches += fileCoverage.branches.covered;
    totalFunctions += fileCoverage.functions.total;
    coveredFunctions += fileCoverage.functions.covered;
    
    const fileLines = fileCoverage.lines.total > 0 ? Math.round((fileCoverage.lines.covered / fileCoverage.lines.total) * 100) : 0;
    const fileStatements = fileCoverage.statements.total > 0 ? Math.round((fileCoverage.statements.covered / fileCoverage.statements.total) * 100) : 0;
    const fileBranches = fileCoverage.branches.total > 0 ? Math.round((fileCoverage.branches.covered / fileCoverage.branches.total) * 100) : 0;
    const fileFunctions = fileCoverage.functions.total > 0 ? Math.round((fileCoverage.functions.covered / fileCoverage.functions.total) * 100) : 0;
    
    if (fileStatements < threshold || fileBranches < threshold || fileFunctions < threshold || fileLines < threshold) {
      lowCoverageFiles.push({
        file: filePath,
        statements: fileStatements,
        branches: fileBranches,
        functions: fileFunctions,
        lines: fileLines,
      });
    }
  }
  
  return {
    lines: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0,
    statements: totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 0,
    branches: totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 100) : 0,
    functions: totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 0,
    available: true,
    lowCoverageFiles: lowCoverageFiles.length > 0 ? lowCoverageFiles : undefined,
  };
}

function extractErrorInfo(fullMessage: string): { message: string; stack?: string } {
  const lines = fullMessage.split('\n');
  const message = truncateMessage(lines[0] || 'Unknown error', 500);
  const stackLines = lines.slice(1).join('\n').trim();
  const stack = stackLines ? truncateStack(stackLines, 10) : undefined;
  return { message, stack };
}

export default parser;
