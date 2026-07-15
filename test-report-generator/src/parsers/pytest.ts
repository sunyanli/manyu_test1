/**
 * pytest JUnit XML 解析器
 * 解析 pytest 生成的 JUnit XML 格式测试结果
 * pytest 的 classname 包含模块路径，如 test_module.TestClass
 */

import { TestResult, TestSuiteResult, TestCaseResult } from '../types';

// 复用 JUnit XML 解析基础设施
const xml2js = require('xml2js');

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

function parseXml(content: string): any {
  const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
  let result: any;
  parser.parseString(content, (err: any, res: any) => {
    if (err) throw err;
    result = res;
  });
  return result!;
}

/**
 * 将 pytest classname 映射为 suiteName
 * pytest 的 classname 格式: test_module.TestClass 或 path.to.module.TestClass
 * 提取模块部分作为 suiteName 的第一部分
 */
function mapClassNameToSuiteName(className: string): string {
  if (!className) return 'Unknown';
  // 取最后一个点之前的部分作为模块路径
  const parts = className.split('.');
  // 如果 classname 包含 . 模式，用模块路径作为 suite name
  if (parts.length > 1) {
    // 取倒数第二个及之前的部分（模块路径）
    return parts.slice(0, -1).join('.');
  }
  return className;
}

export const pytestParser = {
  name: 'pytest-parser',
  framework: 'pytest',

  canParse(content: string, filePath: string): boolean {
    // 检查是否为 XML 且包含 testsuite，且 classname 包含 . 模式的路径
    if (!content.includes('<testsuite') && !content.includes('<testsuites')) {
      return false;
    }
    // 检查是否有 classname 包含 . 模式（pytest 特征）
    const classnameMatch = content.match(/classname="([^"]+)"/);
    if (classnameMatch && classnameMatch[1].includes('.')) {
      return true;
    }
    // 也检查 .xml 文件扩展名
    if (filePath.endsWith('.xml')) {
      return true;
    }
    return false;
  },

  parse(content: string, filePath: string): TestResult {
    try {
      const data = parseXml(content);

      const suites: TestSuiteResult[] = [];
      let total = 0;
      let passed = 0;
      let failed = 0;
      let skipped = 0;
      let pending = 0;
      let totalDuration = 0;

      // 处理 testsuites 或 testsuite 根元素
      const rawSuites = data.testsuites?.testsuite || data.testsuite || [];
      const suiteList = Array.isArray(rawSuites) ? rawSuites : [rawSuites];

      for (const suiteData of suiteList) {
        const suiteName = suiteData.name || 'Unknown';
        const suiteFile = suiteData.file || '';
        const suiteDuration = parseFloat(suiteData.time || '0') * 1000;

        const testCases: TestCaseResult[] = [];
        const rawCases = suiteData.testcase || [];
        const caseList = Array.isArray(rawCases) ? rawCases : [rawCases];

        for (const caseData of caseList) {
          const className = caseData.classname || '';
          const testName = caseData.name || '';
          // 使用 classname 作为 suiteName 的第一部分
          const mappedSuite = mapClassNameToSuiteName(className);

          const duration = parseFloat(caseData.time || '0') * 1000;

          let status: 'passed' | 'failed' | 'skipped' | 'pending';
          const failureMessages: string[] = [];
          let stackTrace: string | undefined;

          if (caseData.skipped || caseData.skip) {
            status = 'skipped';
          } else if (caseData.failure) {
            status = 'failed';
            const failureNodes = Array.isArray(caseData.failure) ? caseData.failure : [caseData.failure];
            for (const fn of failureNodes) {
              const msg = typeof fn === 'string' ? fn : (fn._ || fn.message || '');
              if (msg) failureMessages.push(msg);
              if (!stackTrace && typeof fn === 'object' && fn._) {
                stackTrace = fn._;
              }
            }
          } else if (caseData.error) {
            status = 'failed';
            const errorNodes = Array.isArray(caseData.error) ? caseData.error : [caseData.error];
            for (const en of errorNodes) {
              const msg = typeof en === 'string' ? en : (en._ || en.message || '');
              if (msg) failureMessages.push(msg);
              if (!stackTrace && typeof en === 'object' && en._) {
                stackTrace = en._;
              }
            }
          } else {
            status = 'passed';
          }

          total++;
          if (status === 'passed') passed++;
          if (status === 'failed') failed++;
          if (status === 'skipped') skipped++;
          // pending 在 pytest 中不适用

          testCases.push({
            name: testName,
            suite: mappedSuite,
            file: suiteFile || className,
            status,
            duration,
            failureMessages,
            stackTrace,
          });
        }

        totalDuration += suiteDuration;

        suites.push({
          name: suiteName,
          file: suiteFile,
          testCases,
          duration: suiteDuration,
        });
      }

      const passRate = total > 0 ? Math.round((passed / total) * 10000) / 100 : 0;

      return {
        projectName: 'pytest',
        framework: 'pytest',
        command: 'pytest',
        timestamp: new Date().toISOString(),
        total,
        passed,
        failed,
        skipped,
        pending,
        passRate,
        duration: totalDuration,
        success: failed === 0,
        suites,
        resultFile: filePath,
      };
    } catch (error) {
      return {
        projectName: 'pytest',
        framework: 'pytest',
        command: 'pytest',
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
        error: `解析 pytest JUnit XML 失败: ${error instanceof Error ? error.message : String(error)}`,
        resultFile: filePath,
      };
    }
  },
};