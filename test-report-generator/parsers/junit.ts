/**
 * JUnit XML 解析器
 * 解析标准 JUnit XML 格式（通用兜底解析器）
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
    
    const files: TestFileResult[] = [];
    const failures: TestCaseResult[] = [];
    
    let totalDuration = 0;
    
    for (const suite of testSuites) {
      const cases: TestCaseResult[] = suite.testcases.map(tc => {
        const caseResult: TestCaseResult = {
          name: tc.name,
          file: suite.name,
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
        
        return caseResult;
      });
      
      const fileStats = calculateStats(cases);
      files.push({ file: suite.name, cases, stats: fileStats });
      totalDuration += suite.time;
    }
    
    const summary: TestStats = {
      total: testSuites.reduce((sum, s) => sum + s.tests, 0),
      passed: testSuites.reduce((sum, s) => sum + s.passed, 0),
      failed: testSuites.reduce((sum, s) => sum + s.failures, 0),
      skipped: testSuites.reduce((sum, s) => sum + s.skipped, 0),
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
  status: 'passed' | 'failed' | 'skipped';
  time: number;
  failure?: { message: string; stackTrace?: string };
}

interface JUnitTestSuite {
  name: string;
  tests: number;
  failures: number;
  skipped: number;
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
    const skippedMatch = suiteTag.match(/skipped="(\d+)"/);
    const timeMatch = suiteTag.match(/time="([^"]*)"/);
    
    const suiteStart = match.index!;
    const suiteEnd = content.indexOf('</testsuite>', suiteStart);
    const suiteContent = suiteEnd > 0 ? content.slice(suiteStart, suiteEnd) : content.slice(suiteStart);
    
    const testcases = parseTestCases(suiteContent);
    
    const tests = testsMatch ? parseInt(testsMatch[1], 10) : testcases.length;
    const failures = testcases.filter(t => t.status === 'failed').length;
    const skipped = testcases.filter(t => t.status === 'skipped').length;
    const passed = tests - failures - skipped;
    
    suites.push({
      name: nameMatch?.[1] || 'Unknown Suite',
      tests,
      failures,
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
  const testcaseMatches = content.matchAll(/<testcase[^>]*>([\s\S]*?)<\/testcase>/g);
  
  for (const match of testcaseMatches) {
    const tag = match[1];
    const fullMatch = match[0];
    
    const nameMatch = fullMatch.match(/name="([^"]*)"/);
    const timeMatch = fullMatch.match(/time="([^"]*)"/);
    
    let status: 'passed' | 'failed' | 'skipped' = 'passed';
    let failure: { message: string; stackTrace?: string } | undefined;
    
    if (fullMatch.includes('<failure')) {
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
    
    cases.push({
      name: nameMatch?.[1] || 'Unknown Test',
      status,
      time: timeMatch ? parseFloat(timeMatch[1]) * 1000 : 0,
      failure
    });
  }
  
  return cases;
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