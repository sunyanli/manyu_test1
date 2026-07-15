/**
 * 测试报告生成 Skill - 统一数据模型
 */

export type TestCaseStatus = 'passed' | 'failed' | 'skipped' | 'pending';

export interface TestCaseResult {
  name: string;
  file: string;
  status: TestCaseStatus;
  duration: number;
  error?: string;
  stackTrace?: string;
  suite?: string;
  line?: number;
}

export interface TestFileResult {
  file: string;
  cases: TestCaseResult[];
  stats: TestStats;
}

export interface TestStats {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
  duration: number;
}

export interface CoverageFileDetail {
  file: string;
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

export interface CoverageData {
  statements?: number;
  branches?: number;
  functions?: number;
  lines?: number;
  available: boolean;
  /** 低覆盖率文件清单（<50% 阈值） */
  lowCoverageFiles?: CoverageFileDetail[];
}

export interface ExecutionEnv {
  projectName?: string;
  framework: string;
  frameworkVersion?: string;
  command: string;
  timestamp: string;
}

export interface TestReport {
  version: string;
  env: ExecutionEnv;
  summary: TestStats;
  files: TestFileResult[];
  failures: TestCaseResult[];
  coverage: CoverageData;
  sourceFile?: string;
  conclusion: 'pass' | 'fail' | 'partial';
  /** 用户配置的通过率阈值（可选），低于此值时结论标记为不达标 */
  failThreshold?: number;
}

export interface TestResultParser {
  name: string;
  extensions: string[];
  parse(content: string, filePath: string): Promise<TestReport>;
  canParse(content: string, filePath: string): boolean;
}

export interface TestReportOptions {
  testCommand?: string;
  resultFile?: string;
  outputFormat: 'markdown' | 'html' | 'json';
  outputPath: string;
  coverage: 'auto' | 'on' | 'off';
  failThreshold?: number;
}