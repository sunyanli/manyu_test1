/**
 * Jest JSON 解析器
 * 解析 Jest --json 输出的测试结果
 */

import { TestResult, TestSuiteResult, TestCaseResult } from '../types';

export const jestParser = {
  name: 'jest-parser',
  framework: 'jest',

  canParse(content: string, filePath: string): boolean {
    try {
      const data = JSON.parse(content);
      return data.success !== undefined && data.numTotalTests !== undefined;
    } catch {
      return false;
    }
  },

  parse(content: string, filePath: string): TestResult {
    try {
      const data = JSON.parse(content);
      
      const suites: TestSuiteResult[] = [];
      const testResults = data.testResults || [];
      
      for (const testResult of testResults) {
        const suite: TestSuiteResult = {
          name: testResult.name || 'Unknown Suite',
          file: testResult.name || '',
          duration: testResult.perfStats?.runtime || 0,
          testCases: []
        };
        
        for (const assertion of (testResult.assertionResults || [])) {
          const testCase: TestCaseResult = {
            name: assertion.title || assertion.fullName || 'Unknown Test',
            suite: assertion.ancestorTitles?.join(' > ') || '',
            file: testResult.name || '',
            status: assertion.status || 'pending',
            duration: assertion.duration || 0,
            failureMessages: []
          };
          
          if (assertion.status === 'failed' && assertion.failureMessages?.length > 0) {
            testCase.failureMessages = assertion.failureMessages;
            testCase.stackTrace = assertion.failureMessages.join('\n');
          } else {
            testCase.failureMessages = [];
          }
          
          suite.testCases.push(testCase);
        }
        
        suites.push(suite);
      }
      
      const total = data.numTotalTests || 0;
      const passed = data.numPassedTests || 0;
      const failed = data.numFailedTests || 0;
      const skipped = data.numPendingTests || 0;
      const pending = data.numTodoTests || 0;
      
      return {
        projectName: 'Project',
        framework: 'Jest',
        frameworkVersion: data.testResults?.[0]?.version,
        command: 'npm test -- --json',
        timestamp: new Date().toISOString(),
        total,
        passed,
        failed,
        skipped,
        pending,
        passRate: total > 0 ? Math.round((passed / total) * 10000) / 100 : 0,
        duration: data.startTime ? Date.now() - data.startTime : 0,
        success: data.success === true,
        suites,
        resultFile: filePath
      };
    } catch (error) {
      return {
        projectName: 'Project',
        framework: 'Jest',
        command: 'npm test -- --json',
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
        error: `解析 Jest JSON 失败: ${error instanceof Error ? error.message : String(error)}`,
        resultFile: filePath
      };
    }
  }
};