/**
 * 测试框架检测器
 * 实现 FR1.1 自动识别优先级
 */

import * as fs from 'fs';
import * as path from 'path';

export interface DetectedFramework {
  framework: 'jest' | 'vitest' | 'pytest' | 'junit';
  command: string;
  resultFile: string;
}

const CONFIG_PATTERNS = {
  jest: ['jest.config.js', 'jest.config.ts', 'jest.config.json', 'jest.config.mjs', 'jest.config.cjs'],
  vitest: ['vitest.config.js', 'vitest.config.ts', 'vitest.config.mjs'],
  pytest: ['pytest.ini', 'pyproject.toml', 'setup.cfg'],
};

export class FrameworkDetector {
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
  }

  /**
   * 检测测试框架
   * 优先级: a. 用户显式指定 > b. package.json scripts.test > c. 框架特征文件推断
   */
  detect(testCommand?: string): DetectedFramework | null {
    // 优先级 a: 用户显式指定
    if (testCommand) {
      return this.detectFromCommand(testCommand);
    }

    // 优先级 b: package.json scripts.test
    const pkgResult = this.detectFromPackageJson();
    if (pkgResult) return pkgResult;

    // 优先级 c: 框架特征文件推断
    const configResult = this.detectFromConfigFiles();
    if (configResult) return configResult;

    // Python 项目检测
    const pyResult = this.detectPythonProject();
    if (pyResult) return pyResult;

    return null;
  }

  /**
   * 从文件路径推断框架类型（解析模式）
   */
  inferFromFile(filePath: string): string {
    const lower = filePath.toLowerCase();
    
    if (lower.includes('jest') || lower.endsWith('.json')) {
      return 'jest';
    }
    
    if (lower.includes('vitest')) {
      return 'vitest';
    }
    
    if (lower.includes('pytest') || lower.includes('junit')) {
      return 'junit';
    }
    
    // 默认基于扩展名
    if (lower.endsWith('.json')) {
      return 'jest';
    }
    
    return 'junit';
  }

  private detectFromCommand(command: string): DetectedFramework {
    const cmd = command.toLowerCase();

    if (cmd.includes('jest')) {
      return {
        framework: 'jest',
        command: command,
        resultFile: path.join(this.projectRoot, 'test-results', 'jest-results.json'),
      };
    }

    if (cmd.includes('vitest')) {
      return {
        framework: 'vitest',
        command: command,
        resultFile: path.join(this.projectRoot, 'test-results', 'vitest-results.json'),
      };
    }

    if (cmd.includes('pytest')) {
      return {
        framework: 'pytest',
        command: command,
        resultFile: path.join(this.projectRoot, 'test-results', 'pytest-results.xml'),
      };
    }

    return {
      framework: 'junit',
      command: command,
      resultFile: path.join(this.projectRoot, 'test-results', 'junit.xml'),
    };
  }

  private detectFromPackageJson(): DetectedFramework | null {
    const pkgPath = path.join(this.projectRoot, 'package.json');
    
    if (!fs.existsSync(pkgPath)) {
      return null;
    }

    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const testScript = pkg.scripts?.test || '';

      // Jest 优先
      if (deps.jest || testScript.includes('jest')) {
        return {
          framework: 'jest',
          command: 'npx jest --json --outputFile=test-results/jest-results.json',
          resultFile: path.join(this.projectRoot, 'test-results', 'jest-results.json'),
        };
      }

      // Vitest
      if (deps.vitest || testScript.includes('vitest')) {
        return {
          framework: 'vitest',
          command: 'npx vitest run --reporter=json --outputFile=test-results/vitest-results.json',
          resultFile: path.join(this.projectRoot, 'test-results', 'vitest-results.json'),
        };
      }

      // 使用 test script
      if (testScript) {
        return {
          framework: 'jest',
          command: 'npm test -- --json --outputFile=test-results/jest-results.json',
          resultFile: path.join(this.projectRoot, 'test-results', 'jest-results.json'),
        };
      }
    } catch {
      // ignore
    }

    return null;
  }

  private detectFromConfigFiles(): DetectedFramework | null {
    // Jest 配置文件
    if (this.hasConfigFiles(CONFIG_PATTERNS.jest)) {
      return {
        framework: 'jest',
        command: 'npx jest --json --outputFile=test-results/jest-results.json',
        resultFile: path.join(this.projectRoot, 'test-results', 'jest-results.json'),
      };
    }

    // Vitest 配置文件
    if (this.hasConfigFiles(CONFIG_PATTERNS.vitest)) {
      return {
        framework: 'vitest',
        command: 'npx vitest run --reporter=json --outputFile=test-results/vitest-results.json',
        resultFile: path.join(this.projectRoot, 'test-results', 'vitest-results.json'),
      };
    }

    return null;
  }

  private detectPythonProject(): DetectedFramework | null {
    const pyproject = path.join(this.projectRoot, 'pyproject.toml');
    const pytestIni = path.join(this.projectRoot, 'pytest.ini');

    if (fs.existsSync(pyproject) || fs.existsSync(pytestIni)) {
      return {
        framework: 'pytest',
        command: 'pytest --junitxml=test-results/pytest-results.xml',
        resultFile: path.join(this.projectRoot, 'test-results', 'pytest-results.xml'),
      };
    }

    return null;
  }

  private hasConfigFiles(patterns: string[]): boolean {
    for (const pattern of patterns) {
      if (fs.existsSync(path.join(this.projectRoot, pattern))) {
        return true;
      }
    }
    return false;
  }
}