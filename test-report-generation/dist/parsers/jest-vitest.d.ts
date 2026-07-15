/**
 * Jest/Vitest JSON 解析器
 * @module parsers/jest-vitest
 */
import { TestResult } from '../types';
export declare function parseJestVitestJson(jsonContent: string): TestResult;
export declare function validateJestVitestJson(content: string): boolean;
