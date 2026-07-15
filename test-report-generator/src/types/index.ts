/**
 * 测试报告生成器 - 统一数据模型
 */

/** 单个测试用例结果 */
export interface TestCaseResult {
  name: string;
  suite: string;
  file: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration: number;
  /** 失败信息列表（兼容各框架的错误格式） */
  failureMessages: string[];
  /** 堆栈跟踪（可选） */
  stackTrace?: string;
}

/** 测试套件结果 */
export interface TestSuiteResult {
  name: string;
  file: string;
  testCases: TestCaseResult[];
  duration: number;
}

/** 覆盖率数据 */
export interface CoverageData {
  lines?: number;
  statements?: number;
  branches?: number;
  functions?: number;
  uncoveredFiles?: string[];
}

/** 测试结果汇总 */
export interface TestResult {
  projectName: string;
  framework: string;
  frameworkVersion?: string;
  command: string;
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  pending: number;
  passRate: number;
  duration: number;
  success: boolean;
  suites: TestSuiteResult[];
  coverage?: CoverageData;
  resultFile?: string;
  error?: string;
}

/** 解析器接口 */
export interface TestResultParser {
  name: string;
  framework: string;
  parse(content: string, filePath: string): TestResult;
  canParse(content: string, filePath: string): boolean;
}

/** 报告生成器配置 */
export interface ReportConfig {
  outputFormat: 'markdown' | 'html' | 'json';
  outputPath: string;
  coverage: 'auto' | 'on' | 'off';
  failThreshold?: number;
  executeTest: boolean;
  testCommand?: string;
  resultFile?: string;
}

/** 解析结果 */
export interface ParseResult {
  success: boolean;
  result?: TestResult;
  error?: string;
}