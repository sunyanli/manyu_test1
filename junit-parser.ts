/**
 * JUnit XML 结果解析器
 */

import * as xml2js from 'xml2js';
import { 
  TestResult, 
  TestSuite, 
  TestCase, 
  TestSummary,
  TestMetadata,
  TestError,
  ParserError 
} from './types';

/**
 * JUnit XML 格式
 */
interface JunitXmlRoot {
  testsuites?: JunitTestSuites;
  testsuite?: JunitTestSuite | JunitTestSuite[];
}

interface JunitTestSuites {
  $: {
    name?: string;
    tests?: string;
    failures?: string;
    errors?: string;
    skipped?: string;
    time?: string;
  };
  testsuite: JunitTestSuite | JunitTestSuite[];
}

interface JunitTestSuite {
  $: {
    name?: string;
    tests?: string;
    failures?: string;
    errors?: string;
    skipped?: string;
    time?: string;
    timestamp?: string;
    hostname?: string;
  };
  testcase: JunitTestCase | JunitTestCase[];
  properties?: Array<{
    property: Array<{ $: { name: string; value: string } }>;
  }>;
  'system-out'?: string[];
  'system-err'?: string[];
}

interface JunitTestCase {
  $: {
    name?: string;
    classname?: string;
    time?: string;
  };
  failure?: Array<{
    $: {
      message?: string;
      type?: string;
    };
    _: string;
  }>;
  error?: Array<{
    $: {
      message?: string;
      type?: string;
    };
    _: string;
  }>;
  skipped?: Array<{} | { $: { message?: string } }>;
  'system-out'?: string[];
  'system-err'?: string[];
}

/**
 * 解析 JUnit XML 输出
 */
export async function parseJUnitXml(
  content: string, 
  filePath: string
): Promise<TestResult> {
  let parsed: JunitXmlRoot;

  try {
    const parser = new xml2js.Parser({
      explicitArray: true,
      explicitRoot: false,
      attrNameProcessors: [(name: string) => name]
    });
    
    parsed = await parser.parseStringPromise(content);
  } catch (error) {
    throw new ParserError(
      `无法解析 JUnit XML 文件: ${filePath}`,
      { filePath, error: String(error) }
    );
  }

  // 提取测试套件数组
  const suites = extractTestSuites(parsed);
  
  if (suites.length === 0) {
    throw new ParserError(
      'JUnit XML 不包含有效的测试套件',
      { filePath }
    );
  }

  // 转换为内部格式
  const testSuites = suites.map(suite => parseTestSuite(suite));
  const summary = calculateSummary(testSuites);
  const metadata = parseMetadata(suites, filePath);

  return {
    summary,
    testSuites,
    metadata
  };
}

/**
 * 提取测试套件数组
 */
function extractTestSuites(parsed: JunitXmlRoot): JunitTestSuite[] {
  // 处理 testsuites 根元素
  if (parsed.testsuites) {
    const ts = parsed.testsuites;
    if (Array.isArray(ts.testsuite)) {
      return ts.testsuite;
    }
    return ts.testsuite ? [ts.testsuite] : [];
  }

  // 处理 testsuite 根元素
  if (parsed.testsuite) {
    if (Array.isArray(parsed.testsuite)) {
      return parsed.testsuite;
    }
    return [parsed.testsuite];
  }

  return [];
}

/**
 * 解析单个测试套件
 */
function parseTestSuite(suite: JunitTestSuite): TestSuite {
  const attrs = suite.$ || {};
  const name = attrs.name || 'Unknown Suite';
  const duration = parseFloat(attrs.time || '0') * 1000; // 秒转毫秒

  // 解析测试用例
  let testCases: TestCase[] = [];
  if (suite.testcase) {
    const cases = Array.isArray(suite.testcase) ? suite.testcase : [suite.testcase];
    testCases = cases.map(tc => parseTestCase(tc));
  }

  return {
    name,
    filePath: name, // JUnit XML 通常不包含文件路径
    duration,
    tests: testCases
  };
}

/**
 * 解析单个测试用例
 */
function parseTestCase(tc: JunitTestCase): TestCase {
  const attrs = tc.$ || {};
  const name = attrs.name || attrs.classname || 'Unknown Test';
  const duration = parseFloat(attrs.time || '0') * 1000;

  // 判断状态
  let status: 'passed' | 'failed' | 'skipped' | 'pending' = 'passed';
  let error: TestError | undefined;

  if (tc.failure && tc.failure.length > 0) {
    status = 'failed';
    error = parseError(tc.failure[0]);
  } else if (tc.error && tc.error.length > 0) {
    status = 'failed';
    error = parseError(tc.error[0]);
  } else if (tc.skipped && tc.skipped.length > 0) {
    status = 'skipped';
  }

  return {
    name,
    status,
    duration,
    error
  };
}

/**
 * 解析错误信息
 */
function parseError(
  errorElem: { $?: { message?: string; type?: string }; _: string }
): TestError {
  const attrs = errorElem.$ || {};
  const message = attrs.message || 'Test failed';
  const type = attrs.type || '';
  const stackTrace = errorElem._ || '';

  // 清理堆栈跟踪
  const cleanStack = cleanStackTrace(stackTrace);

  return {
    message: `${type}: ${message}`.trim(),
    stack: cleanStack.length > 0 ? cleanStack : undefined
  };
}

/**
 * 清理堆栈跟踪
 */
function cleanStackTrace(stack: string): string {
  // 移除控制字符
  let cleaned = stack.replace(/[\x00-\x1F\x7F]/g, ' ');
  
  // 限制长度
  const lines = cleaned.split('\n').slice(0, 20);
  cleaned = lines.join('\n');

  // 过滤敏感信息
  cleaned = cleaned.replace(/password\s*[=:]\s*\S+/gi, 'password=***');
  cleaned = cleaned.replace(/token\s*[=:]\s*\S+/gi, 'token=***');
  cleaned = cleaned.replace(/api[_-]?key\s*[=:]\s*\S+/gi, 'api_key=***');

  return cleaned.trim();
}

/**
 * 计算测试摘要
 */
function calculateSummary(testSuites: TestSuite[]): TestSummary {
  let total = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let totalDuration = 0;

  for (const suite of testSuites) {
    totalDuration += suite.duration;
    
    for (const test of suite.tests) {
      total++;
      totalDuration += test.duration;
      
      switch (test.status) {
        case 'passed':
          passed++;
          break;
        case 'failed':
          failed++;
          break;
        case 'skipped':
        case 'pending':
          skipped++;
          break;
      }
    }
  }

  const passRate = total > 0 ? (passed / total) * 100 : 0;

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
    duration: totalDuration,
    passRate,
    status
  };
}

/**
 * 解析元数据
 */
function parseMetadata(suites: JunitTestSuite[], filePath: string): TestMetadata {
  // 从第一个套件提取元数据
  const firstSuite = suites[0];
  const attrs = firstSuite?.$ || {};

  const properties: Record<string, string> = {};
  
  // 提取 properties
  if (firstSuite?.properties?.[0]?.property) {
    for (const prop of firstSuite.properties[0].property) {
      if (prop.$?.name && prop.$?.value) {
        properties[prop.$.name] = prop.$.value;
      }
    }
  }

  const env: Record<string, string> = { ...properties };
  if (attrs.hostname) {
    env.hostname = attrs.hostname;
  }
  
  return {
    framework: 'junit',
    command: `JUnit XML Parser (${filePath})`,
    startTime: attrs.timestamp,
    environment: env
  };
}

/**
 * 检查是否可以解析该文件
 */
export function canParseJUnitXml(filePath: string, content: string): boolean {
  const ext = filePath.toLowerCase();
  if (!ext.endsWith('.xml')) {
    return false;
  }

  // 检查 XML 声明或 testsuites/testsuites 标签
  const trimmed = content.trim();
  return (
    trimmed.startsWith('<?xml') ||
    trimmed.includes('<testsuites') ||
    trimmed.includes('<testsuite')
  );
}