/**
 * JUnit XML 解析器
 * @module parsers/junit-xml
 */
import { TestResult } from '../types';
export declare function parseJUnitXml(xmlContent: string): TestResult;
export declare function validateJUnitXml(content: string): boolean;
