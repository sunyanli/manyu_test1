"use strict";
/**
 * JUnit XML 解析器
 * @module parsers/junit-xml
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseJUnitXml = parseJUnitXml;
exports.validateJUnitXml = validateJUnitXml;
function parseJUnitXml(xmlContent) {
    const testCases = [];
    const summary = {
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
            const testCase = {
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
function extractTestSuites(xml) {
    const suites = [];
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
function extractTestCases(xml) {
    const cases = [];
    const tcRegex = /<testcase[^>]*name="([^"]*)"(?:[^>]*classname="([^"]*)")?[^>]*time="([^"]*)"[^>]*\/?>(.*?)<\/testcase>?/gis;
    let match;
    while ((match = tcRegex.exec(xml)) !== null) {
        const [, name, classname, time, content] = match;
        let status = 'passed';
        let error;
        if (content?.includes('<failure') || content?.includes('<error')) {
            status = 'failed';
            const msgMatch = /<(?:failure|error)[^>]*message="([^"]*)"/i.exec(content);
            error = {
                message: msgMatch?.[1] || 'Test failed',
                stack: content.replace(/<[^>]+>/g, '').trim().slice(0, 500)
            };
        }
        else if (content?.includes('<skipped')) {
            status = 'skipped';
        }
        cases.push({ name, classname, time, status, error });
    }
    return cases;
}
function validateJUnitXml(content) {
    return content.includes('<testsuite') || content.includes('<?xml');
}
