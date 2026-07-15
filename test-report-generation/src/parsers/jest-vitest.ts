/**
 * Jest/Vitest JSON 解析器
 * @module parsers/jest-vitest
 */

import { TestResult, TestCase, TestSummary, CoverageData } from '../types';

export function parseJestVitestJson(jsonContent: string): TestResult {
  const data = JSON.parse(jsonContent);
  
  const testCases: TestCase[] = [];
  let totalDuration = 0;
  const summary: TestSummary = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
    passRate: 0
  };
  
  // 解析 Jest/Vitest JSON 输出格式
  if (data.testResults) {
    for (const testResult of data.testResults) {
      const file = testResult.name || 'unknown';
      
      for (const assertion of testResult.assertionResults || []) {
        const testCase: TestCase = {
          name: assertion.fullName || assertion.title,
          file,
          status: assertion.status === 'passed' ? 'passed' : 
                  assertion.status === 'failed' ? 'failed' : 'skipped',
          duration: assertion.duration || 0
        };
        
        if (assertion.failureMessages?.length > 0) {
          testCase.error = {
            message: assertion.failureMessages[0].split('\n')[0],
            stack: assertion.failureMessages[0]
          };
        }
        
        testCases.push(testCase);
        summary[testCase.status]++;
        totalDuration += testCase.duration;
      }
    }
  }
  
  summary.total = testCases.length;
  summary.duration = totalDuration;
  summary.passRate = summary.total > 0 ? (summary.passed / summary.total) * 100 : 0;
  
  // 解析覆盖率
  let coverage: CoverageData | undefined;
  if (data.coverageMap) {
    coverage = extractCoverage(data.coverageMap);
  }
  
  return {
    summary,
    testCases,
    coverage,
    metadata: {
      framework: data.name?.includes('vitest') ? 'vitest' : 'jest',
      command: '',
      timestamp: new Date().toISOString(),
      resultFile: undefined
    }
  };
}

function extractCoverage(coverageMap: any): CoverageData {
  let totalLines = 0, coveredLines = 0;
  let totalBranches = 0, coveredBranches = 0;
  let totalFunctions = 0, coveredFunctions = 0;
  let totalStatements = 0, coveredStatements = 0;
  
  for (const file of Object.values(coverageMap) as any[]) {
    if (file?.l) {
      for (const count of Object.values(file.l) as number[]) {
        totalLines++;
        if (count > 0) coveredLines++;
      }
    }
    if (file?.b) {
      for (const branch of Object.values(file.b) as number[][]) {
        for (const count of branch) {
          totalBranches++;
          if (count > 0) coveredBranches++;
        }
      }
    }
    if (file?.f) {
      for (const count of Object.values(file.f) as number[]) {
        totalFunctions++;
        if (count > 0) coveredFunctions++;
      }
    }
    if (file?.s) {
      for (const count of Object.values(file.s) as number[]) {
        totalStatements++;
        if (count > 0) coveredStatements++;
      }
    }
  }
  
  return {
    lines: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0,
    statements: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0,
    branches: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0,
    functions: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0
  };
}

export function validateJestVitestJson(content: string): boolean {
  try {
    const data = JSON.parse(content);
    return data.testResults !== undefined;
  } catch {
    return false;
  }
}