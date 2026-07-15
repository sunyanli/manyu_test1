/**
 * 测试报告生成器 - 核心类型定义
 */

// ============ 测试结果类型 ============

export interface TestCase {
  name: string;
  suite?: string;
  file: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration: number; // milliseconds
  error?: TestError;
}

export interface TestError {
  message: string;
  stack?: string;
  expected?: string;
  actual?: string;
}

export interface TestSuite {
  name: string;
  file: string;
  testCases: TestCase[];
  duration: number;
}

export interface TestResult {
  framework: TestFramework;
  suites: TestSuite[];
  summary: TestSummary;
  coverage?: CoverageResult;
  timestamp: string;
  command: string;
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  pending: number;
  duration: number;
  passRate: number;
  success: boolean;
}

export interface CoverageResult {
  lines: number;
  statements: number;
  branches: number;
  functions: number;
  files?: CoverageFile[];
}

export interface CoverageFile {
  path: string;
  lines: number;
  statements: number;
  branches: number;
  functions: number;
}

export type TestFramework = 'jest' | 'vitest' | 'pytest' | 'junit' | 'unknown';

// ============ 配置类型 ============

export interface TestReportConfig {
  testCommand?: string;
  resultFile?: string;
  outputFormat: 'markdown' | 'html' | 'json';
  outputPath: string;
  coverage: 'auto' | 'on' | 'off';
  failThreshold?: number;
  mode: 'execute' | 'parse';
  projectRoot?: string;
}

export const DEFAULT_CONFIG: TestReportConfig = {
  outputFormat: 'markdown',
  outputPath: 'reports',
  coverage: 'auto',
  mode: 'execute',
};

// ============ 报告类型 ============

export interface TestReport {
  header: ReportHeader;
  summary: TestSummary;
  failures?: FailureAnalysis[];
  details?: TestSuiteDetail[];
  coverage?: CoverageResult;
  appendix: ReportAppendix;
}

export interface ReportHeader {
  projectName: string;
  generatedAt: string;
  command: string;
  framework: string;
  version?: string;
  environment?: string;
}

export interface FailureAnalysis {
  name: string;
  suite?: string;
  file: string;
  error: TestError;
  stackSummary?: string;
}

export interface TestSuiteDetail {
  name: string;
  file: string;
  testCases: TestCaseDetail[];
  duration: number;
}

export interface TestCaseDetail {
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration: number;
}

export interface ReportAppendix {
  resultFiles: string[];
  toolVersion: string;
}

// ============ 错误类型 ============

export class TestReportError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'TestReportError';
  }
}

export const ErrorCodes = {
  FRAMEWORK_NOT_DETECTED: 'FRAMEWORK_NOT_DETECTED',
  TEST_EXECUTION_FAILED: 'TEST_EXECUTION_FAILED',
  RESULT_PARSE_FAILED: 'RESULT_PARSE_FAILED',
  INVALID_RESULT_FILE: 'INVALID_RESULT_FILE',
  REPORT_GENERATION_FAILED: 'REPORT_GENERATION_FAILED',
} as const;