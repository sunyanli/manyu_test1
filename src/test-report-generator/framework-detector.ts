/**
 * 框架检测器 - 自动识别项目使用的测试框架
 */

import { TestFramework } from './types/index';

export interface FrameworkInfo {
  framework: TestFramework;
  command: string;
  configFiles: string[];
  version?: string;
}

export class FrameworkDetector {
  /**
   * 检测项目使用的测试框架
   */
  async detect(projectRoot: string): Promise<FrameworkInfo | null> {
    // Jest 检测
    const jestInfo = this.detectJest(projectRoot);
    if (jestInfo) return jestInfo;

    // Vitest 检测
    const vitestInfo = this.detectVitest(projectRoot);
    if (vitestInfo) return vitestInfo;

    // pytest 检测
    const pytestInfo = this.detectPytest(projectRoot);
    if (pytestInfo) return pytestInfo;

    return null;
  }

  private detectJest(projectRoot: string): FrameworkInfo | null {
    const configFiles = [
      'jest.config.js',
      'jest.config.ts',
      'jest.config.json',
      'jest.config.mjs',
    ];

    // 简化检测逻辑（实际运行时需要 fs 检查）
    return {
      framework: 'jest',
      command: 'npx jest --json --outputFile=test-results.json',
      configFiles,
    };
  }

  private detectVitest(projectRoot: string): FrameworkInfo | null {
    const configFiles = [
      'vitest.config.ts',
      'vitest.config.js',
      'vite.config.ts',
    ];

    return {
      framework: 'vitest',
      command: 'npx vitest run --reporter=json --outputFile=test-results.json',
      configFiles,
    };
  }

  private detectPytest(projectRoot: string): FrameworkInfo | null {
    const configFiles = [
      'pytest.ini',
      'pyproject.toml',
      'setup.cfg',
    ];

    return {
      framework: 'pytest',
      command: 'pytest --junit-xml=junit.xml',
      configFiles,
    };
  }

  /**
   * 根据文件路径推断框架
   */
  inferFromFile(filePath: string): TestFramework {
    if (filePath.includes('jest')) return 'jest';
    if (filePath.includes('vitest')) return 'vitest';
    if (filePath.includes('pytest') || filePath.endsWith('.py')) return 'pytest';
    if (filePath.includes('junit') || filePath.endsWith('.xml')) return 'junit';
    return 'unknown';
  }
}

export const frameworkDetector = new FrameworkDetector();