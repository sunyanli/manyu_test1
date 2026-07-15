/**
 * 测试框架检测器
 * @module detector
 */
import { DetectedFramework } from './types';
export declare function detectTestFramework(projectRoot: string): Promise<DetectedFramework | null>;
