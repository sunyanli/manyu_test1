/**
 * 测试报告生成 Skill - 主入口
 * @module index
 */
import { ReportOptions, SkillResult } from './types';
/**
 * 生成测试报告
 */
export declare function generateTestReport(options?: ReportOptions): Promise<SkillResult>;
export * from './types';
export * from './detector';
export * from './parsers/jest-vitest';
export * from './parsers/junit-xml';
export * from './generator/markdown';
