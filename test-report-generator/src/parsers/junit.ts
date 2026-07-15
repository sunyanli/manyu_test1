/**
 * JUnit XML 解析器
 * 解析标准 JUnit XML 格式的测试结果
 */

import { TestResult, TestSuiteResult, TestCaseResult } from '../types';

function extractText(node: any, tag: string): string {
  const child = node[tag];
  if (!child) return '';
  if (typeof child === 'string') return child;
  if (Array.isArray(child) && child[0]) {
    return typeof child[0] === 'string' ? child[0] : child[0]._ || '';
  }
  if (child._) return child._;
  return '';
}

function parseJUnitXml(xmlContent: string): any {
  // 简单 XML 解析（不依赖外部库）
  const result: any = { testsuites: [] };
  
  // 提取 testsuite 元素
  const suiteRegex = /<testsuite[^>]*>([\s\S]*?)<\/testsuite>/gi;
  let suiteMatch;
  
  while ((suiteMatch = suiteRegex.exec(xmlContent)) !== null) {
    const suiteContent = suiteMatch[1];
    const suiteAttrMatch = suiteMatch[0].match(/<testsuite[^>]*>/);
    
    const suite: any = {
      attrs: {},
      testcases: []
    };
    
    // 解析属性
    if (suiteAttrMatch) {
      const attrRegex = /(\w+)="([^"]*)"/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(suiteAttrMatch[0])) !== null) {
        suite.attrs[attrMatch[1]] = attrMatch[2];
      }
    }
    
    // 解析 testcase 元素
    const caseRegex = /<testcase[^>]*>([\s\S]*?)<\/testcase>/gi;
    let caseMatch;
    
    while ((caseMatch = caseRegex.exec(suiteContent)) !== null) {
      const caseContent = caseMatch[1];
      const caseAttrMatch = caseMatch[0].match(/<testcase[^>]*>/);
      
      const testcase: any = { attrs: {} };
      
      if (caseAttrMatch) {
        const attrRegex = /(\w+)="([^"]*)"/g;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(caseAttrMatch[0])) !== null) {
          testcase.attrs[attrMatch[1]] = attrMatch[2];
        }
      }
      
      // 检查失败
      if (caseContent.includes('<failure')) {
        testcase.failure = true;
        const failureMatch = caseContent.match(/<failure[^>]*>([\s\S]*?)<\/failure>/i);
        if (failureMatch) {
          testcase.failureMessage = failureMatch[1].trim();
        }
      }
      
      // 检查跳过
      if (caseContent.includes('<skipped')) {
        testcase.skipped = true;
      }
      
      suite.testcases.push(testcase);
    }
    
    result.testsuites.push(suite);
  }
  
  return result;
}

export const junitParser = {
  name: 'junit-parser',
  framework: 'junit',

  canParse(content: string, filePath: string): boolean {
    return content.includes('<testsuite') || content.includes('<?xml') && content.includes('testsuite');
  },

  parse(content: string, filePath: string): TestResult {
    try {
      const data = parseJUnitXml(content);
      
      const suites: TestSuiteResult[] = [];
      let total = 0;
      let passed = 0;
      let failed = 0;
      let skipped = 0;
      let pending = 0;
      let totalDuration = 0;
      
      for (const suiteData of data.testsuites) {
        const suite: TestSuiteResult = {
          name: suiteData.attrs.name || 'Unknown Suite',
          file: suiteData.attrs.filepath || suiteData.attrs.name || '',
          duration: parseFloat(suiteData.attrs.time) * 1000 || 0,
          testCases: []
        };
        
        totalDuration += suite.duration;
        
        for (const caseData of suiteData.testcases) {
          const testCase: TestCaseResult = {
            name: caseData.attrs.name || 'Unknown Test',
            suite: suite.name,
            file: suite.file,
            status: 'passed',
            duration: parseFloat(caseData.attrs.time) * 1000 || 0
          };
          
          total++;
          
          if (caseData.failure) {
            testCase.status = 'failed';
            failed++;
            testCase.error = {
              message: caseData.failureMessage || 'Test failed'
            };
          } else if (caseData.skipped) {
            testCase.status = 'skipped';
            skipped++;
          } else {
            passed++;
          }
          
          suite.testCases.push(testCase);
        }
        
        suites.push(suite);
      }
      
      return {
        projectName: 'Project',
        framework: 'JUnit',
        command: 'test runner',
        timestamp: new Date().toISOString(),
        total,
        passed,
        failed,
        skipped,
        pending,
        passRate: total > 0 ? Math.round((passed / total) * 10000) / 100 : 0,
        duration: totalDuration,
        success: failed === 0,
        suites,
        resultFile: filePath
      };
    } catch (error) {
      return {
        projectName: 'Project',
        framework: 'JUnit',
        command: 'test runner',
        timestamp: new Date().toISOString(),
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        pending: 0,
        passRate: 0,
        duration: 0,
        success: false,
        suites: [],
        error: `解析 JUnit XML 失败: ${error instanceof Error ? error.message : String(error)}`,
        resultFile: filePath
      };
    }
  }
};