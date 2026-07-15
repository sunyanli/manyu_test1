/**
 * Jest JSON 解析器
 * 解析 Jest --json 输出格式
 */

import * as fs from 'fs';
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

function extractErrorInfo(fullMessage: string): { message: string; stack?: string } {
  const lines = fullMessage.split('\n');
  const message = truncateMessage(lines[0] || 'Unknown error', 500);
  const stackLines = lines.slice(1).join('\n').trim();
  const stack = stackLines ? truncateStack(stackLines, 10) : undefined;
  return { message, stack };
}

function truncateMessage(message: string, maxLength: number): string {
  if (message.length <= maxLength) return message;
  return message.slice(0, maxLength) + '... (截断)';
}

function truncateStack(stack: string, maxLines: number): string {
  const lines = stack.split('\n');
  if (lines.length <= maxLines) return stack;
  return lines.slice(0, maxLines).join('\n') + '\n... (截断)';
}

// ========== Coverage 解析 ==========

interface IstanbulFileCoverage {
  s: Record<string, number>;
  b: Record<string, number[]>;
  f: Record<string, number>;
  statementMap: Record<string, { start: { line: number; column: number }; end: { line: number; column: number } }>;
}

type IstanbulCoverageMap = Record<string, IstanbulFileCoverage>;

export interface CoverageFileDetail {
  file: string;
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

export interface CoverageResult {
  summary: CoverageData;
  lowCoverageFiles: CoverageFileDetail[];
}

export function parseCoverage(coverageDir?: string): CoverageResult | null {
  const dir = coverageDir || 'coverage';
  const coveragePath = `${dir}/coverage-final.json`;

  let raw: string;
  try {
    raw = fs.readFileSync(coveragePath, 'utf-8');
  } catch {
    return null;
  }

  let data: IstanbulCoverageMap;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  const fileDetails: CoverageFileDetail[] = [];
  let totalStatements = 0, coveredStatements = 0;
  let totalBranches = 0, coveredBranches = 0;
  let totalFunctions = 0, coveredFunctions = 0;
  let totalLines = 0, coveredLines = 0;

  for (const [filePath, fc] of Object.entries(data)) {
    const stmtKeys = Object.keys(fc.s);
    const stmtCovered = stmtKeys.filter(k => fc.s[k] > 0).length;
    totalStatements += stmtKeys.length;
    coveredStatements += stmtCovered;

    const branchKeys = Object.keys(fc.b);
    const branchCovered = branchKeys.filter(k => fc.b[k].some(v => v > 0)).length;
    totalBranches += branchKeys.length;
    coveredBranches += branchCovered;

    const funcKeys = Object.keys(fc.f);
    const funcCovered = funcKeys.filter(k => fc.f[k] > 0).length;
    totalFunctions += funcKeys.length;
    coveredFunctions += funcCovered;

    const allLines = new Set<number>();
    const coveredLineSet = new Set<number>();
    for (const key of stmtKeys) {
      const sm = fc.statementMap[key];
      if (sm) {
        for (let l = sm.start.line; l <= sm.end.line; l++) {
          allLines.add(l);
          if (fc.s[key] > 0) coveredLineSet.add(l);
        }
      }
    }
    totalLines += allLines.size;
    coveredLines += coveredLineSet.size;

    fileDetails.push({
      file: filePath,
      statements: stmtKeys.length > 0 ? Math.round((stmtCovered / stmtKeys.length) * 100) : 0,
      branches: branchKeys.length > 0 ? Math.round((branchCovered / branchKeys.length) * 100) : 0,
      functions: funcKeys.length > 0 ? Math.round((funcCovered / funcKeys.length) * 100) : 0,
      lines: allLines.size > 0 ? Math.round((coveredLineSet.size / allLines.size) * 100) : 0,
    });
  }

  const lowCoverageFiles = fileDetails.filter(
    f => f.statements < 50 || f.branches < 50 || f.functions < 50 || f.lines < 50
  );

  return {
    summary: {
      statements: totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 0,
      branches: totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 100) : 0,
      functions: totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 0,
      lines: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0,
      available: true,
    },
    lowCoverageFiles,
  };
}

export default parser;
