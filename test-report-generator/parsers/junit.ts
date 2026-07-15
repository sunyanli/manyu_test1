/**
 * JUnit XML 解析器
 * 解析标准 JUnit XML 格式（通用兜底解析器）
 * 支持 pytest 生成的 JUnit XML（含 <error> 元素、classname 属性）
 */

import { TestReport, TestStats, TestCaseResult, TestFileResult, ExecutionEnv, CoverageData, TestResultParser } from '../types';

const parser: TestResultParser = {
  name: 'junit',
  extensions: ['.xml'],
  
  canParse(content: string, filePath: string): boolean {
    if (!filePath.endsWith('.xml')) return false;
    return content.includes('<testsuite') || content.includes('<testcase');
  },
  
  async parse(content: string, filePath: string): Promise<TestReport> {
    const testSuites = parseJUnitXML(content);
    
    const failures: TestCaseResult[] = [];
    const fileMap = new Map<string, TestCaseResult[]>();
    
    let totalDuration = 0;
    
    for (const suite of testSuites) {
      for (const tc of suite.testcases) {
        // 根据 classname 推导文件路径（pytest 兼容：test_module.TestClass → test_module.py）
        let filePath: string;
        if (tc.classname) {
          filePath = classnameToFilePath(tc.classname);
        } else {
          filePath = suite.name;
        }
        
        const caseResult: TestCaseResult = {
          name: tc.name,
          file: filePath,
          status: tc.status,
          duration: tc.time,
          suite: suite.name
        };
        
        if (tc.status === 'failed' && tc.failure) {
          caseResult.error = tc.failure.message || 'Test failed';
          if (tc.failure.stackTrace) {
            caseResult.stackTrace = truncateStack(tc.failure.stackTrace, 500);
          }
          failures.push(caseResult);
        }
        
        if (!fileMap.has(filePath)) {
          fileMap.set(filePath, []);
        }
        fileMap.get(filePath)!.push(caseResult);
      }
      totalDuration += suite.time;
    }
    
    const files: TestFileResult[] = [];
    for (const [filePath, cases] of fileMap) {
      const fileStats = calculateStats(cases);
      files.push({ file: filePath, cases, stats: fileStats });
    }
    
    // 汇总：suite 属性缺失时值为 -1，汇总时用实际计数作为后备
    const summaryTotal = testSuites.reduce((sum, s) => sum + (s.tests >= 0 ? s.tests : s.testcases.length), 0);
    const summaryPassed = testSuites.reduce((sum, s) => {
      if (s.passed >= 0) return sum + s.passed;
      return sum + s.testcases.filter(t => t.status === 'passed').length;
    }, 0);
    const summaryFailed = testSuites.reduce((sum, s) => {
      const f = s.failures >= 0 ? s.failures : 0;
      const e = s.errors >= 0 ? s.errors : 0;
      return sum + f + e;
    }, 0);
    const summarySkipped = testSuites.reduce((sum, s) => {
      if (s.skipped >= 0) return sum + s.skipped;
      return sum + s.testcases.filter(t => t.status === 'skipped').length;
    }, 0);
    
    const summary: TestStats = {
      total: summaryTotal,
      passed: summaryPassed,
      failed: summaryFailed,
      skipped: summarySkipped,
      passRate: 0,
      duration: totalDuration
    };
    summary.passRate = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;
    
    const env: ExecutionEnv = {
      framework: 'JUnit',
      command: 'JUnit XML 解析',
      timestamp: new Date().toISOString()
    };
    
    return {
      version: '1.0.0',
      env,
      summary,
      files,
      failures,
      coverage: { available: false },
      sourceFile: filePath,
      conclusion: summary.failed > 0 ? 'fail' : 'pass'
    };
  }
};

interface JUnitTestCase {
  name: string;
  /** pytest 的 classname 属性，用于推导源文件路径 */
  classname?: string;
  status: 'passed' | 'failed' | 'skipped';
  time: number;
  failure?: { message: string; stackTrace?: string };
}

interface JUnitTestSuite {
  name: string;
  /** 属性缺失时为 -1，表示"未获取" */
  tests: number;
  /** 属性缺失时为 -1，表示"未获取" */
  failures: number;
  /** 属性缺失时为 -1，表示"未获取"（pytest error 计数） */
  errors: number;
  /** 属性缺失时为 -1，表示"未获取" */
  skipped: number;
  /** 属性缺失时为 -1，表示"未获取" */
  passed: number;
  time: number;
  testcases: JUnitTestCase[];
}

function parseJUnitXML(content: string): JUnitTestSuite[] {
  const suites: JUnitTestSuite[] = [];
  
  const testsuiteMatches = content.matchAll(/<testsuite[^>]*>/g);
  
  for (const match of testsuiteMatches) {
    const suiteTag = match[0];
    const nameMatch = suiteTag.match(/name="([^"]*)"/);
    const testsMatch = suiteTag.match(/tests="(\d+)"/);
    const failuresMatch = suiteTag.match(/failures="(\d+)"/);
    const errorsMatch = suiteTag.match(/errors="(\d+)"/);
    const skippedMatch = suiteTag.match(/skipped="(\d+)"/);
    const timeMatch = suiteTag.match(/time="([^"]*)"/);
    
    const suiteStart = match.index!;
    const suiteEnd = content.indexOf('</testsuite>', suiteStart);
    const suiteContent = suiteEnd > 0 ? content.slice(suiteStart, suiteEnd) : content.slice(suiteStart);
    
    const testcases = parseTestCases(suiteContent);
    
    // 属性缺失时使用 -1 标记"未获取"
    const tests = testsMatch ? parseInt(testsMatch[1], 10) : -1;
    const failures = failuresMatch ? parseInt(failuresMatch[1], 10) : -1;
    const errors = errorsMatch ? parseInt(errorsMatch[1], 10) : -1;
    const skipped = skippedMatch ? parseInt(skippedMatch[1], 10) : -1;
    
    let passed: number;
    if (tests >= 0) {
      const effFailures = failures >= 0 ? failures : 0;
      const effErrors = errors >= 0 ? errors : 0;
      const effSkipped = skipped >= 0 ? skipped : 0;
      passed = tests - effFailures - effErrors - effSkipped;
    } else {
      passed = testcases.filter(t => t.status === 'passed').length;
    }
    
    suites.push({
      name: nameMatch?.[1] || 'Unknown Suite',
      tests,
      failures,
      errors,
      skipped,
      passed,
      time: timeMatch ? parseFloat(timeMatch[1]) * 1000 : 0,
      testcases
    });
  }
  
  if (suites.length === 0) {
    const testcases = parseTestCases(content);
    if (testcases.length > 0) {
      suites.push({
        name: 'Test Suite',
        tests: testcases.length,
        failures: testcases.filter(t => t.status === 'failed').length,
        errors: 0,
        skipped: testcases.filter(t => t.status === 'skipped').length,
        passed: testcases.filter(t => t.status === 'passed').length,
        time: testcases.reduce((sum, t) => sum + t.time, 0),
        testcases
      });
    }
  }
  
  return suites;
}

function parseTestCases(content: string): JUnitTestCase[] {
  const cases: JUnitTestCase[] = [];
  // 支持自闭合 <testcase ... /> 和常规 <testcase ...>...</testcase> 两种形式
  const testcaseMatches = content.matchAll(/<testcase\b[^>]*\/>|<testcase\b[^\/>]*>([\s\S]*?)<\/testcase>/g);
  
  for (const match of testcaseMatches) {
    const tag = match[1] || '';
    const fullMatch = match[0];
    
    const nameMatch = fullMatch.match(/\bname="([^"]*)"/);
    const classnameMatch = fullMatch.match(/classname="([^"]*)"/);
    const timeMatch = fullMatch.match(/time="([^"]*)"/);
    
    let status: 'passed' | 'failed' | 'skipped' = 'passed';
    let failure: { message: string; stackTrace?: string } | undefined;
    
    // <error> 元素（pytest 收集错误）—— 与 <failure> 并列，计为失败
    if (fullMatch.includes('<error')) {
      status = 'failed';
      const errorMatch = fullMatch.match(/<error[^>]*message="([^"]*)"[^>]*>([\s\S]*?)<\/error>/);
      if (errorMatch) {
        failure = {
          message: errorMatch[1],
          stackTrace: errorMatch[2]?.trim() || undefined
        };
      } else {
        const simpleErrorMatch = fullMatch.match(/<error[^>]*>/);
        if (simpleErrorMatch) {
          failure = { message: 'Test error (collection error)' };
        }
      }
    } else if (fullMatch.includes('<failure')) {
      status = 'failed';
      const failureMatch = fullMatch.match(/<failure[^>]*message="([^"]*)"[^>]*>([\s\S]*?)<\/failure>/);
      if (failureMatch) {
        failure = {
          message: failureMatch[1],
          stackTrace: failureMatch[2]?.trim() || undefined
        };
      } else {
        const simpleFailureMatch = fullMatch.match(/<failure[^>]*>/);
        if (simpleFailureMatch) {
          failure = { message: 'Test failed' };
        }
      }
    } else if (fullMatch.includes('<skipped') || tag.includes('<skipped')) {
      status = 'skipped';
    }
    
    // name 属性缺失 → classname 作为后备 → "unknown" 作为最终后备
    let testName: string;
    if (nameMatch?.[1]) {
      testName = nameMatch[1];
    } else if (classnameMatch?.[1]) {
      testName = classnameMatch[1];
    } else {
      testName = 'unknown';
    }
    
    cases.push({
      name: testName,
      classname: classnameMatch?.[1],
      status,
      time: timeMatch ? parseFloat(timeMatch[1]) * 1000 : 0,
      failure
    });
  }
  
  return cases;
}

/**
 * 将 pytest classname 转换为文件路径
 * 例: test_module.TestClass → test_module.py
 * 例: test_calc → test_calc.py
 */
function classnameToFilePath(classname: string): string {
  const dotIndex = classname.lastIndexOf('.');
  if (dotIndex > 0) {
    return classname.substring(0, dotIndex) + '.py';
  }
  return classname + '.py';
}

function truncateStack(stack: string, maxLength: number): string {
  if (stack.length <= maxLength) return stack;
  return stack.slice(0, maxLength) + '\n... (截断)';
}

function calculateStats(cases: TestCaseResult[]): TestStats {
  const total = cases.length;
  const passed = cases.filter(c => c.status === 'passed').length;
  const failed = cases.filter(c => c.status === 'failed').length;
  const skipped = cases.filter(c => c.status === 'skipped').length;
  const duration = cases.reduce((sum, c) => sum + c.duration, 0);
  return { total, passed, failed, skipped, passRate: total > 0 ? Math.round((passed / total) * 100) : 0, duration };
}

export default parser;