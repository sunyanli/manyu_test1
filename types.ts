/**
 * 测试报告生成器 - 核心类型定义
 */

// ========== 测试框架类型 ==========

export type TestFramework = 'jest' | 'vitest' | 'pytest' | 'junit' | 'unknown';

export interface FrameworkInfo {
  name: TestFramework;
  version?: string;
  configPath?: string;
  testCommand: string;
  resultFormat: 'json' | 'junit-xml';
}

// ========== 测试结果类型 ==========

export interface TestResult {
  summary: TestSummary;
  testSuites: TestSuite[];
  coverage?: CoverageData;
  metadata: TestMetadata;
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number; // 毫秒
  passRate: number; // 百分比
  status: 'passed' | 'failed' | 'partial';
}

export interface TestSuite {
  name: string;
  filePath: string;
  duration: number;
  tests: TestCase[];
}

export interface TestCase {
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration: number;
  error?: TestError;
}

export interface TestError {
  message: string;
  stack?: string;
  expected?: string;
  received?: string;
}

export interface CoverageData {
  lines: CoverageMetric;
  statements: CoverageMetric;
  branches: CoverageMetric;
  functions: CoverageMetric;
  files?: FileCoverage[];
}

export interface CoverageMetric {
  total: number;
  covered: number;
  percentage: number;
}

export interface FileCoverage {
  path: string;
  lines: number;
  statements: number;
  branches: number;
  functions: number;
}

export interface TestMetadata {
  projectName?: string;
  framework: TestFramework;
  frameworkVersion?: string;
  command: string;
  startTime?: string;
  endTime?: string;
  environment?: Record<string, string>;
}

// ========== 报告配置类型 ==========

export interface ReportConfig {
  testCommand?: string;
  resultFile?: string;
  outputFormat: 'markdown' | 'html' | 'json';
  outputPath: string;
  coverage: 'auto' | 'on' | 'off';
  failThreshold?: number;
}

export interface GeneratorOptions {
  projectName?: string;
  timestamp: string;
  maxFailedCases?: number;
  maxTestDetails?: number;
  failThreshold?: number;
}

// ========== 解析器接口 ==========

export interface TestResultParser {
  framework: TestFramework;
  parse(content: string, filePath: string): Promise<TestResult>;
  canParse(filePath: string, content: string): boolean;
}

// ========== 报告生成器接口 ==========

export interface ReportGenerator {
  format: 'markdown' | 'html' | 'json';
  generate(result: TestResult, options: GeneratorOptions): string;
}

// ========== 错误类型 ==========

export class TestReportError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TestReportError';
  }
}

export class ParserError extends TestReportError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'PARSER_ERROR', details);
    this.name = 'ParserError';
  }
}

export class FrameworkDetectionError extends TestReportError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'FRAMEWORK_DETECTION_ERROR', details);
    this.name = 'FrameworkDetectionError';
  }
}

export class TestExecutionError extends TestReportError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'TEST_EXECUTION_ERROR', details);
    this.name = 'TestExecutionError';
  }
}