/**
 * Vitest JSON 解析器
 * 解析 Vitest --reporter=json 输出格式
 */

import * as fs from 'fs';
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
            caseResult.error = truncateMessage(test.error.message || 'Unknown error', 500);
            if (test.error.stack) {
              caseResult.stackTrace = truncateStack(test.error.stack, 10);
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

function truncateMessage(message: string, maxLength: number): string {
  if (message.length <= maxLength) return message;
  return message.slice(0, maxLength) + '... (截断)';
}

function truncateStack(stack: string, maxLines: number): string {
  const lines = stack.split('\n');
  if (lines.length <= maxLines) return stack;
  return lines.slice(0, maxLines).join('\n') + '\n... (截断)';
}

function calculateStats(cases: TestCaseResult[]): TestStats {
  const total = cases.length;
  const passed = cases.filter(c => c.status === 'passed').length;
  const failed = cases.filter(c => c.status === 'failed').length;
  const skipped = cases.filter(c => c.status === 'skipped').length;
  const duration = cases.reduce((sum, c) => sum + c.duration, 0);
  return { total, passed, failed, skipped, passRate: total > 0 ? Math.round((passed / total) * 100) : 0, duration };
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
