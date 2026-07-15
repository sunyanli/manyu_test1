/**
 * JUnit XML 解析器
 * @module parsers/junit-xml
 */

import { TestResult, TestCase, TestSummary, CoverageData } from '../types';

export function parseJUnitXml(xmlContent: string): TestResult {
  const testCases: TestCase[] = [];
  const summary: TestSummary = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
    passRate: 0
  };
  
  // 简单 XML 解析（无外部依赖）
  const testSuites = extractTestSuites(xmlContent);
  
  for (const suite of testSuites) {
    const file = suite.name || 'unknown';
    
    for (const tc of suite.testcases || []) {
      const testCase: TestCase = {
        name: tc.name || 'unknown',
        file: tc.classname ? `${tc.classname}.ts` : file,
        status: tc.status,
        duration: parseFloat(tc.time || '0') * 1000
      };
      
      if (tc.error) {
        testCase.error = typeof tc.error === 'string' 
          ? { message: tc.error }
          : { message: tc.error.message || 'Unknown error', stack: tc.error.stack };
      }
      
      testCases.push(testCase);
      summary[testCase.status]++;
      summary.duration += testCase.duration;
    }
  }
  
  summary.total = testCases.length;
  summary.passRate = summary.total > 0 ? (summary.passed / summary.total) * 100 : 0;
  
  return {
    summary,
    testCases,
    metadata: {
      framework: 'junit-xml',
      command: '',
      timestamp: new Date().toISOString()
    }
  };
}

interface TestSuite {
  name?: string;
  testcases: Array<{
    name?: string;
    classname?: string;
    time?: string;
    status: 'passed' | 'failed' | 'skipped';
    error?: { message?: string; stack?: string };
  }>;
}

function extractTestSuites(xml: string): TestSuite[] {
  const suites: TestSuite[] = [];
  
  // 提取 testsuite 元素
  const suiteRegex = /<testsuite[^>]*name="([^"]*)"[^>]*>(.*?)<\/testsuite>/gis;
  let match;
  
  while ((match = suiteRegex.exec(xml)) !== null) {
    const suiteName = match[1];
    const suiteContent = match[2];
    
    const testcases = extractTestCases(suiteContent);
    suites.push({ name: suiteName, testcases });
  }
  
  return suites;
}

function extractTestCases(xml: string): TestSuite['testcases'] {
  const cases: TestSuite['testcases'] = [];
  
  const tcRegex = /<testcase[^>]*name="([^"]*)"(?:[^>]*classname="([^"]*)")?[^>]*time="([^"]*)"[^>]*\/?>(.*?)<\/testcase>?/gis;
  let match;
  
  while ((match = tcRegex.exec(xml)) !== null) {
    const [, name, classname, time, content] = match;
    
    let status: 'passed' | 'failed' | 'skipped' = 'passed';
    let error: { message?: string; stack?: string } | undefined;
    
    if (content?.includes('<failure') || content?.includes('<error')) {
      status = 'failed';
      const msgMatch = /<(?:failure|error)[^>]*message="([^"]*)"/i.exec(content);
      error = {
        message: msgMatch?.[1] || 'Test failed',
        stack: content.replace(/<[^>]+>/g, '').trim().slice(0, 500)
      };
    } else if (content?.includes('<skipped')) {
      status = 'skipped';
    }
    
    cases.push({ name, classname, time, status, error });
  }
  
  return cases;
}

export function validateJUnitXml(content: string): boolean {
  return content.includes('<testsuite') || content.includes('<?xml');
}