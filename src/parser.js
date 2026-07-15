/**
 * 测试结果解析器 - 支持 Jest/Vitest JSON、JUnit XML、pytest
 */

const fs = require('fs');
const path = require('path');
const { parseString } = require('xml2js');

class TestResultParser {
  constructor() {
    this.parsers = {
      jest: this.parseJestJson.bind(this),
      vitest: this.parseVitestJson.bind(this),
      junit: this.parseJUnitXml.bind(this),
      pytest: this.parsePytestJson.bind(this)
    };
  }

  /**
   * 自动检测结果文件格式并解析
   */
  async parse(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const format = this.detectFormat(filePath, content);
    
    if (!format || !this.parsers[format]) {
      throw new Error(`不支持的测试结果格式: ${filePath}`);
    }
    
    return this.parsers[format](content);
  }

  /**
   * 检测结果文件格式
   */
  detectFormat(filePath, content) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.json') {
      try {
        const data = JSON.parse(content);
        if (data.success !== undefined || data.testResults) return 'jest';
        if (data.result) return 'vitest';
        if (data.tests) return 'pytest';
      } catch {
        return null;
      }
    }
    
    if (ext === '.xml' || content.trim().startsWith('<?xml')) {
      return 'junit';
    }
    
    return null;
  }

  /**
   * 解析 Jest JSON 结果
   */
  async parseJestJson(content) {
    const data = JSON.parse(content);
    const result = this.createEmptyResult();
    
    result.framework = 'Jest';
    result.metadata = { version: data.version || 'unknown' };
    
    if (data.testResults) {
      for (const testFile of data.testResults) {
        const fileResult = {
          file: testFile.name,
          tests: [],
          duration: testFile.duration || 0,
          status: testFile.status
        };
        
        for (const assertion of (testFile.assertionResults || [])) {
          const testCase = {
            name: assertion.title,
            fullName: assertion.fullName || assertion.title,
            status: this.mapStatus(assertion.status),
            duration: assertion.duration || 0,
            location: assertion.location
          };
          
          if (assertion.status === 'failed') {
            testCase.error = this.extractError(assertion.failureMessages);
            testCase.stack = this.extractStack(assertion.failureMessages);
          }
          
          fileResult.tests.push(testCase);
          this.updateSummary(result.summary, testCase.status);
        }
        
        result.testFiles.push(fileResult);
      }
    }
    
    result.summary.duration = data.duration || 0;
    result.summary.passRate = this.calculatePassRate(result.summary);
    
    return result;
  }

  /**
   * 解析 Vitest JSON 结果
   */
  async parseVitestJson(content) {
    const data = JSON.parse(content);
    const result = this.createEmptyResult();
    
    result.framework = 'Vitest';
    
    const testResult = data.result || {};
    
    if (testResult.testResults) {
      for (const testFile of testResult.testResults) {
        const fileResult = {
          file: testFile.name,
          tests: [],
          duration: testFile.duration || 0
        };
        
        for (const assertion of (testFile.assertionResults || [])) {
          const testCase = {
            name: assertion.title,
            fullName: assertion.fullName || assertion.title,
            status: this.mapStatus(assertion.status),
            duration: assertion.duration || 0
          };
          
          if (assertion.status === 'failed') {
            testCase.error = assertion.failureMessage || 'Test failed';
          }
          
          fileResult.tests.push(testCase);
          this.updateSummary(result.summary, testCase.status);
        }
        
        result.testFiles.push(fileResult);
      }
    }
    
    result.summary.duration = testResult.duration || 0;
    result.summary.passRate = this.calculatePassRate(result.summary);
    
    return result;
  }

  /**
   * 解析 JUnit XML 结果
   */
  async parseJUnitXml(content) {
    return new Promise((resolve, reject) => {
      parseString(content, (err, data) => {
        if (err) {
          reject(new Error(`JUnit XML 解析失败: ${err.message}`));
          return;
        }
        
        const result = this.createEmptyResult();
        result.framework = 'JUnit XML';
        
        const testSuites = data.testsuites?.testsuite || [data.testsuite].filter(Boolean);
        
        for (const suite of testSuites) {
          const fileResult = {
            file: suite.$.name || 'Unknown Suite',
            tests: [],
            duration: parseFloat(suite.$.time || 0) * 1000
          };
          
          const testCases = suite.testcase || [];
          for (const tc of testCases) {
            const status = tc.failure ? 'failed' : (tc.skipped ? 'skipped' : 'passed');
            const testCase = {
              name: tc.$.name,
              status,
              duration: parseFloat(tc.$.time || 0) * 1000
            };
            
            if (status === 'failed' && tc.failure) {
              testCase.error = tc.failure[0]._;
              testCase.stack = tc.failure[0].$?.message || '';
            }
            
            fileResult.tests.push(testCase);
            this.updateSummary(result.summary, status);
          }
          
          result.testFiles.push(fileResult);
        }
        
        result.summary.passRate = this.calculatePassRate(result.summary);
        resolve(result);
      });
    });
  }

  /**
   * 解析 pytest JSON 结果
   */
  async parsePytestJson(content) {
    const data = JSON.parse(content);
    const result = this.createEmptyResult();
    
    result.framework = 'pytest';
    
    if (data.tests) {
      for (const test of data.tests) {
        const fileResult = {
          file: test.filepath || test.filename || 'Unknown',
          tests: [],
          duration: test.duration || 0
        };
        
        const testCase = {
          name: test.name,
          status: this.mapPytestStatus(test.outcome),
          duration: test.duration || 0
        };
        
        if (test.outcome === 'failed') {
          testCase.error = test.call?.crash?.message || 'Test failed';
        }
        
        fileResult.tests.push(testCase);
        this.updateSummary(result.summary, testCase.status);
        
        // 添加到已存在的文件组
        const existingFile = result.testFiles.find(f => f.file === fileResult.file);
        if (existingFile) {
          existingFile.tests.push(testCase);
        } else {
          result.testFiles.push(fileResult);
        }
      }
    }
    
    result.summary.duration = data.duration || 0;
    result.summary.passRate = this.calculatePassRate(result.summary);
    
    return result;
  }

  /**
   * 创建空结果结构
   */
  createEmptyResult() {
    return {
      framework: null,
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        passRate: 0
      },
      testFiles: [],
      metadata: {}
    };
  }

  /**
   * 更新摘要计数
   */
  updateSummary(summary, status) {
    summary.total++;
    if (status === 'passed') summary.passed++;
    else if (status === 'failed') summary.failed++;
    else if (status === 'skipped') summary.skipped++;
  }

  /**
   * 计算通过率
   */
  calculatePassRate(summary) {
    if (summary.total === 0) return 0;
    return Math.round((summary.passed / summary.total) * 100) / 100;
  }

  /**
   * 映射状态到标准格式
   */
  mapStatus(status) {
    const statusMap = {
      passed: 'passed',
      failed: 'failed',
      skipped: 'skipped',
      pending: 'skipped',
      todo: 'skipped',
      disabled: 'skipped'
    };
    return statusMap[status] || 'unknown';
  }

  /**
   * 映射 pytest 状态
   */
  mapPytestStatus(outcome) {
    const map = {
      passed: 'passed',
      failed: 'failed',
      skipped: 'skipped'
    };
    return map[outcome] || 'unknown';
  }

  /**
   * 提取错误信息
   */
  extractError(failureMessages) {
    if (!failureMessages || !failureMessages.length) return 'Unknown error';
    const msg = failureMessages[0];
    return msg.split('\n')[0];
  }

  /**
   * 提取堆栈信息（截断）
   */
  extractStack(failureMessages, maxLength = 500) {
    if (!failureMessages || !failureMessages.length) return '';
    const msg = failureMessages[0];
    const lines = msg.split('\n').slice(0, 10);
    return lines.join('\n').substring(0, maxLength);
  }
}

module.exports = TestResultParser;