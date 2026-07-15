/**
 * Jest/Vitest JSON 结果解析器
 */

import { 
  TestResult, 
  TestSuite, 
  TestCase, 
  TestSummary,
  TestMetadata,
  TestError,
  CoverageData,
  CoverageMetric,
  ParserError 
} from './types';

/**
 * Jest JSON 结果格式
 */
interface JestJsonResult {
  success: boolean;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  numTodoTests: number;
  startTime: number;
  elapsedSeconds?: number;
  testResults: JestTestResult[];
  coverageMap?: JestCoverageMap;
}

interface JestTestResult {
  name: string;
  filePath: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending' | 'todo' | 'disabled';
  message: string;
  numPassingTests: number;
  numFailingTests: number;
  numPendingTests: number;
  assertionResults: JestAssertionResult[];
  perfStats: {
    start: number;
    end: number;
    runtime: number;
  };
}

interface JestAssertionResult {
  ancestorTitles: string[];
  fullName: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending' | 'todo' | 'disabled';
  title: string;
  duration?: number;
  failureMessages?: string[];
  location?: {
    column: number;
    line: number;
  };
}

interface JestCoverageMap {
  [filePath: string]: JestFileCoverage;
}

interface JestFileCoverage {
  lines: { total: number; covered: number; skipped: number; percentage: number };
  statements: { total: number; covered: number; skipped: number; percentage: number };
  functions: { total: number; covered: number; skipped: number; percentage: number };
  branches: { total: number; covered: number; skipped: number; percentage: number };
}

/**
 * 解析 Jest/Vitest JSON 输出
 */
export async function parseJestJson(
  content: string, 
  filePath: string
): Promise<TestResult> {
  let data: JestJsonResult;
  
  try {
    data = JSON.parse(content);
  } catch (error) {
    throw new ParserError(
      `无法解析 Jest JSON 文件: ${filePath}`,
      { filePath, error: String(error) }
    );
  }

  // 验证必要字段
  if (typeof data.numTotalTests !== 'number') {
    throw new ParserError(
      'Jest JSON 缺少必要字段 numTotalTests',
      { filePath, data }
    );
  }

  const summary = parseSummary(data);
  const testSuites = parseTestSuites(data);
  const coverage = parseCoverage(data);
  const metadata = parseMetadata(data, filePath);

  return {
    summary,
    testSuites,
    coverage,
    metadata
  };
}

/**
 * 解析测试摘要
 */
function parseSummary(data: JestJsonResult): TestSummary {
  const total = data.numTotalTests || 0;
  const passed = data.numPassedTests || 0;
  const failed = data.numFailedTests || 0;
  const skipped = (data.numPendingTests || 0) + (data.numTodoTests || 0);
  const passRate = total > 0 ? (passed / total) * 100 : 0;
  const duration = data.elapsedSeconds ? data.elapsedSeconds * 1000 : 0;

  let status: 'passed' | 'failed' | 'partial';
  if (failed === 0 && passed > 0) {
    status = 'passed';
  } else if (passed === 0 && failed > 0) {
    status = 'failed';
  } else if (failed > 0) {
    status = 'partial';
  } else {
    status = 'passed';
  }

  return {
    total,
    passed,
    failed,
    skipped,
    duration,
    passRate,
    status
  };
}

/**
 * 解析测试套件
 */
function parseTestSuites(data: JestJsonResult): TestSuite[] {
  if (!data.testResults || !Array.isArray(data.testResults)) {
    return [];
  }

  return data.testResults.map(suite => {
    const tests: TestCase[] = suite.assertionResults.map(assertion => ({
      name: assertion.fullName || assertion.title,
      status: mapTestStatus(assertion.status),
      duration: assertion.duration || 0,
      error: extractError(assertion)
    }));

    return {
      name: suite.name,
      filePath: suite.filePath,
      duration: suite.perfStats?.runtime || 0,
      tests
    };
  });
}

/**
 * 映射测试状态
 */
function mapTestStatus(
  status: string
): 'passed' | 'failed' | 'skipped' | 'pending' {
  switch (status) {
    case 'passed':
      return 'passed';
    case 'failed':
      return 'failed';
    case 'skipped':
    case 'disabled':
    case 'todo':
      return 'skipped';
    case 'pending':
      return 'pending';
    default:
      return 'passed';
  }
}

/**
 * 提取错误信息
 */
function extractError(assertion: JestAssertionResult): TestError | undefined {
  if (assertion.status !== 'failed' || !assertion.failureMessages?.length) {
    return undefined;
  }

  const failureMessage = assertion.failureMessages[0];
  const errorInfo = parseErrorMessage(failureMessage);

  return errorInfo;
}

/**
 * 解析错误消息
 */
function parseErrorMessage(message: string): TestError {
  // 移除 ANSI 颜色代码
  const cleanMessage = message.replace(/\x1b\[[0-9;]*m/g, '');
  
  // 提取错误消息
  const lines = cleanMessage.split('\n');
  const firstLine = lines[0] || 'Unknown error';
  
  // 提取 expected/received
  const expectedMatch = cleanMessage.match(/Expected:?\s*(.+?)(?:\n|$)/i);
  const receivedMatch = cleanMessage.match(/Received:?\s*(.+?)(?:\n|$)/i);

  // 提取堆栈
  const stackMatch = cleanMessage.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/g);
  const stack = stackMatch 
    ? stackMatch.slice(0, 10).join('\n') 
    : extractStackFromMessage(cleanMessage);

  return {
    message: firstLine.trim(),
    stack: stack || undefined,
    expected: expectedMatch?.[1]?.trim(),
    received: receivedMatch?.[1]?.trim()
  };
}

/**
 * 从消息中提取堆栈信息
 */
function extractStackFromMessage(message: string): string | undefined {
  const stackLines: string[] = [];
  const lines = message.split('\n');
  let inStack = false;

  for (const line of lines) {
    if (line.includes('at ') || line.includes('↳')) {
      inStack = true;
      stackLines.push(line.trim());
    } else if (inStack && stackLines.length < 10) {
      stackLines.push(line.trim());
    }
  }

  return stackLines.length > 0 ? stackLines.join('\n') : undefined;
}

/**
 * 解析覆盖率数据
 */
function parseCoverage(data: JestJsonResult): CoverageData | undefined {
  if (!data.coverageMap || typeof data.coverageMap !== 'object') {
    return undefined;
  }

  const files = Object.entries(data.coverageMap);
  if (files.length === 0) {
    return undefined;
  }

  // 计算总覆盖率
  let totalLines = 0;
  let coveredLines = 0;
  let totalStatements = 0;
  let coveredStatements = 0;
  let totalBranches = 0;
  let coveredBranches = 0;
  let totalFunctions = 0;
  let coveredFunctions = 0;

  const fileCoverages = files.map(([path, coverage]) => {
    totalLines += coverage.lines.total;
    coveredLines += coverage.lines.covered;
    totalStatements += coverage.statements.total;
    coveredStatements += coverage.statements.covered;
    totalBranches += coverage.branches.total;
    coveredBranches += coverage.branches.covered;
    totalFunctions += coverage.functions.total;
    coveredFunctions += coverage.functions.covered;

    return {
      path,
      lines: coverage.lines.percentage,
      statements: coverage.statements.percentage,
      branches: coverage.branches.percentage,
      functions: coverage.functions.percentage
    };
  });

  return {
    lines: createMetric(totalLines, coveredLines),
    statements: createMetric(totalStatements, coveredStatements),
    branches: createMetric(totalBranches, coveredBranches),
    functions: createMetric(totalFunctions, coveredFunctions),
    files: fileCoverages
  };
}

/**
 * 创建覆盖率指标
 */
function createMetric(total: number, covered: number): CoverageMetric {
  return {
    total,
    covered,
    percentage: total > 0 ? (covered / total) * 100 : 0
  };
}

/**
 * 解析元数据
 */
function parseMetadata(data: JestJsonResult, filePath: string): TestMetadata {
  return {
    framework: 'jest',
    command: `Jest JSON Parser (${filePath})`,
    startTime: data.startTime ? new Date(data.startTime).toISOString() : undefined,
    environment: {
      node: process.version,
      platform: process.platform
    }
  };
}

/**
 * 检查是否可以解析该文件
 */
export function canParseJestJson(filePath: string, content: string): boolean {
  const ext = filePath.toLowerCase();
  if (!ext.endsWith('.json')) {
    return false;
  }

  try {
    const data = JSON.parse(content);
    // 检查 Jest 特征字段
    return (
      typeof data.numTotalTests === 'number' ||
      typeof data.success === 'boolean' ||
      Array.isArray(data.testResults)
    );
  } catch {
    return false;
  }
}