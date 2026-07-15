/**
 * Jest/Vitest JSON 结果解析器
 */

import { TestResult, TestSuite, TestCase, TestFramework } from '../types/index';

interface JestJsonResult {
  success: boolean;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  numTodoTests: number;
  startTime: number;
  testResults: JestTestResult[];
  coverageMap?: unknown;
}

interface JestTestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending' | 'todo';
  assertionResults: JestAssertionResult[];
  startTime: number;
  endTime: number;
  message: string;
}

interface JestAssertionResult {
  ancestorTitles: string[];
  fullName: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending' | 'todo';
  title: string;
  duration?: number;
  failureMessages?: string[];
  location?: { column: number; line: number };
}

export async function parseJestJson(
  content: string,
  filePath: string,
  framework: TestFramework = 'jest'
): Promise<TestResult> {
  let data: JestJsonResult;
  
  try {
    data = JSON.parse(content);
  } catch (e) {
    throw new Error(`Failed to parse Jest JSON: ${e}`);
  }

  const suites: TestSuite[] = [];
  let totalDuration = 0;

  for (const result of data.testResults || []) {
    const testCases: TestCase[] = result.assertionResults.map((assertion) => {
      const tc: TestCase = {
        name: assertion.fullName || assertion.title,
        suite: assertion.ancestorTitles?.join(' > ') || undefined,
        file: result.name,
        status: mapStatus(assertion.status),
        duration: assertion.duration || 0,
      };

      if (assertion.status === 'failed' && assertion.failureMessages?.length) {
        tc.error = {
          message: assertion.failureMessages[0],
        };
      }

      return tc;
    });

    const suiteDuration = (result.endTime || 0) - (result.startTime || 0);
    totalDuration += suiteDuration;

    suites.push({
      name: result.name,
      file: result.name,
      testCases,
      duration: suiteDuration,
    });
  }

  const total = data.numTotalTests || 0;
  const passed = data.numPassedTests || 0;
  const failed = data.numFailedTests || 0;
  const skipped = (data as any).numSkippedTests || 0;
  const pending = data.numPendingTests || 0;

  return {
    framework,
    suites,
    summary: {
      total,
      passed,
      failed,
      skipped,
      pending,
      duration: totalDuration,
      passRate: total > 0 ? (passed / total) * 100 : 0,
      success: data.success || false,
    },
    timestamp: new Date(data.startTime || Date.now()).toISOString(),
    command: '',
  };
}

function mapStatus(status: string): 'passed' | 'failed' | 'skipped' | 'pending' {
  const map: Record<string, 'passed' | 'failed' | 'skipped' | 'pending'> = {
    passed: 'passed',
    failed: 'failed',
    skipped: 'skipped',
    pending: 'pending',
    todo: 'pending',
  };
  return map[status] || 'pending';
}

export function detectJestJson(filePath: string, content?: string): boolean {
  if (filePath.includes('jest') && filePath.endsWith('.json')) return true;
  if (filePath.includes('vitest') && filePath.endsWith('.json')) return true;
  if (content && content.includes('numTotalTests') && content.includes('testResults')) return true;
  return false;
}