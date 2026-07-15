/**
 * JUnit XML 结果解析器
 */

import { TestResult, TestSuite, TestCase } from '../types/index';

export async function parseJUnitXml(content: string, filePath: string): Promise<TestResult> {
  const suites = parseTestSuites(content);
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let skippedTests = 0;
  let totalDuration = 0;

  for (const suite of suites) {
    totalDuration += suite.duration;
    for (const tc of suite.testCases) {
      totalTests++;
      if (tc.status === 'passed') passedTests++;
      else if (tc.status === 'failed') failedTests++;
      else if (tc.status === 'skipped') skippedTests++;
    }
  }

  return {
    framework: 'junit',
    suites,
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      skipped: skippedTests,
      pending: 0,
      duration: totalDuration,
      passRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
      success: failedTests === 0,
    },
    timestamp: new Date().toISOString(),
    command: '',
  };
}

function parseTestSuites(xml: string): TestSuite[] {
  const suites: TestSuite[] = [];
  
  // 简单的正则解析（生产环境应使用 xml2js 等库）
  const testSuiteRegex = /<testsuite[^>]*name="([^"]*)"[^>]*>/g;
  const matches = [...xml.matchAll(testSuiteRegex)];
  
  for (const match of matches) {
    const suiteName = match[1];
    const suiteStart = match.index!;
    const suiteEnd = xml.indexOf('</testsuite>', suiteStart);
    const suiteContent = xml.slice(suiteStart, suiteEnd + 12);
    
    suites.push(parseTestSuite(suiteContent, suiteName));
  }
  
  return suites;
}

function parseTestSuite(content: string, suiteName: string): TestSuite {
  const testCases: TestCase[] = [];
  
  const caseRegex = /<testcase[^>]*name="([^"]*)"[^>]*>/g;
  const matches = [...content.matchAll(caseRegex)];
  
  for (const match of matches) {
    const caseStart = match.index!;
    const caseEnd = content.indexOf('</testcase>', caseStart);
    const caseContent = caseEnd > caseStart ? content.slice(caseStart, caseEnd + 11) : match[0];
    
    const name = match[1];
    const fileAttr = /file="([^"]*)"/.exec(caseContent);
    const timeAttr = /time="([^"]*)"/.exec(caseContent);
    
    let status: 'passed' | 'failed' | 'skipped' = 'passed';
    let error: { message: string } | undefined;
    
    if (caseContent.includes('<failure')) {
      status = 'failed';
      const failMatch = /<failure[^>]*message="([^"]*)"/.exec(caseContent);
      if (failMatch) {
        error = { message: failMatch[1] };
      }
    } else if (caseContent.includes('<skipped')) {
      status = 'skipped';
    }
    
    testCases.push({
      name,
      file: fileAttr?.[1] || suiteName,
      status,
      duration: timeAttr ? parseFloat(timeAttr[1]) * 1000 : 0,
      error,
    });
  }
  
  const timeAttr = /time="([^"]*)"/.exec(content);
  const duration = timeAttr ? parseFloat(timeAttr[1]) * 1000 : 0;
  
  return {
    name: suiteName,
    file: suiteName,
    testCases,
    duration,
  };
}

export function detectJUnitXml(filePath: string, content?: string): boolean {
  if (filePath.endsWith('.xml') && filePath.toLowerCase().includes('junit')) return true;
  if (content && content.includes('<testsuite') && content.includes('<testcase')) return true;
  return false;
}