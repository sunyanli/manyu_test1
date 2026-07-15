/**
 * 测试报告生成 Skill - 核心类型定义
 * @module types
 */
export interface TestSummary {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    passRate: number;
}
export interface TestError {
    message: string;
    stack?: string;
}
export interface TestCase {
    name: string;
    file: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    error?: TestError;
}
export interface CoverageData {
    lines: number;
    statements: number;
    branches: number;
    functions: number;
    uncoveredFiles?: string[];
}
export interface TestResult {
    summary: TestSummary;
    testCases: TestCase[];
    coverage?: CoverageData;
    metadata: {
        framework: string;
        command: string;
        timestamp: string;
        resultFile?: string;
        projectName?: string;
    };
}
export interface ReportOptions {
    outputPath?: string;
    format?: 'markdown' | 'html' | 'json';
    failThreshold?: number;
    testCommand?: string;
    resultFile?: string;
    coverage?: 'auto' | 'on' | 'off';
    projectName?: string;
}
export interface DetectedFramework {
    name: 'jest' | 'vitest' | 'pytest' | 'junit-xml';
    command: string;
    configPath?: string;
    resultFormat: 'jest-json' | 'junit-xml' | 'pytest-json';
}
export interface SkillResult {
    success: boolean;
    reportPath?: string;
    summary?: TestSummary;
    errors?: string[];
    topFailures?: Array<{
        name: string;
        message: string;
    }>;
}
