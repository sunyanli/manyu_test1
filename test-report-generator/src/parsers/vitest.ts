/**
 * Vitest JSON 解析器
 * 解析 Vitest --reporter=json 输出的测试结果
 */

import { TestResult, TestSuiteResult, TestCaseResult } from '../types';

export const vitestParser = {
  name: 'vitest-parser',
  framework: 'vitest',

  canParse(content: string, filePath: string): boolean {
    try {
      const data = JSON.parse(content);
      return Array.isArray(data.testResults) || data.testResults !== undefined;
    } catch {
      return false;
    }
  },

  parse(content: string, filePath: string): TestResult {
    try {
      const data = JSON.parse(content);
      
      const suites: TestSuiteResult[] = [];
      const testResults = data.testResults || [];
      let totalDuration = 0;
      let total = 0;
      let passed = 0;
      let failed = 0;
      let skipped = 0;
      let pending = 0;
      
      for (const fileResult of testResults) {
        const suite: TestSuiteResult = {
          name: fileResult.name || fileResult.filepath || 'Unknown Suite',
          file: fileResult.filepath || fileResult.name || '',
          duration: fileResult.duration || 0,
          testCases: []
        };
        
        totalDuration += suite.duration;
        
        const tests = fileResult.tests || [];
        for (const test of tests) {
          const testCase: TestCaseResult = {
            name: test.name || test.title || 'Unknown Test',
            suite: test.suiteName || '',
            file: suite.file,
            status: test.status || 'pending',
            duration: test.duration || 0
          };
          
          total++;
          if (testCase.status === 'passed') passed++;
          else if (testCase.status === 'failed') {
            failed++;
            if (test.error) {
              testCase.error = {
                message: test.error.message || String(test.error),
                stack: test.error.stack
              };
            }
          }
          else if (testCase.status === 'skipped') skipped++;
          else pending++;
          
          suite.testCases.push(testCase);
        }
        
        suites.push(suite);
      }
      
      return {
        projectName: 'Project',
        framework: 'Vitest',
        command: 'vitest run --reporter=json',
        timestamp: new Date().toISOString(),
        total,
        passed,
        failed,
        skipped,
        pending,
        passRate: total > 0 ? Math.round((passed / total) * 10000) / 100 : 0,
        duration: totalDuration,
        success: failed === 0,
        suites,
        resultFile: filePath
      };
    } catch (error) {
      return {
        projectName: 'Project',
        framework: 'Vitest',
        command: 'vitest run --reporter=json',
        timestamp: new Date().toISOString(),
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        pending: 0,
        passRate: 0,
        duration: 0,
        success: false,
        suites: [],
        error: `解析 Vitest JSON 失败: ${error instanceof Error ? error.message : String(error)}`,
        resultFile: filePath
      };
    }
  }
};