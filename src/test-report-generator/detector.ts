/**
 * 测试框架检测器
 * 实现 FR1.1 自动识别优先级
 */

import * as fs from 'fs';
import * as path from 'path';

export interface FrameworkInfo {
  name: 'jest' | 'vitest' | 'pytest' | 'junit';
  command: string;
  resultFile: string;
  configFiles: string[];
}

const CONFIG_FILE_PATTERNS: Record<string, string[]> = {
  jest: ['jest.config.js', 'jest.config.ts', 'jest.config.json', 'jest.config.mjs', 'jest.config.cjs'],
  vitest: ['vitest.config.js', 'vitest.config.ts', 'vitest.config.mjs', 'vitest.config.ts'],
  pytest: ['pytest.ini', 'pyproject.toml', 'setup.cfg', 'tox.ini'],
};

const PACKAGE_JSON_SCRIPTS: Record<string, string> = {
  jest: 'jest',
  vitest: 'vitest',
};

/**
 * 检测测试框架
 * 优先级: a. 用户显式指定 > b. package.json scripts.test > c. 框架特征文件推断
 */
export async function detectFramework(
  projectRoot: string,
  explicitCommand?: string
): Promise<FrameworkInfo | null> {
  // 优先级 a: 用户显式指定
  if (explicitCommand) {
    return detectFromExplicitCommand(explicitCommand, projectRoot);
  }

  // 优先级 b: package.json scripts.test
  const pkgJsonFramework = detectFromPackageJson(projectRoot);
  if (pkgJsonFramework) {
    return pkgJsonFramework;
  }

  // 优先级 c: 框架特征文件推断
  const configFramework = detectFromConfigFiles(projectRoot);
  if (configFramework) {
    return configFramework;
  }

  // 尝试 pyproject.toml (Python 项目)
  const pythonFramework = detectPythonFramework(projectRoot);
  if (pythonFramework) {
    return pythonFramework;
  }

  return null;
}

/**
 * 从显式命令推断框架
 */
function detectFromExplicitCommand(command: string, projectRoot: string): FrameworkInfo {
  const cmd = command.toLowerCase();

  // 检测命令中的框架标识
  if (cmd.includes('jest')) {
    return {
      name: 'jest',
      command: command,
      resultFile: path.join(projectRoot, 'test-results', 'jest-results.json'),
      configFiles: findConfigFiles(projectRoot, CONFIG_FILE_PATTERNS.jest),
    };
  }

  if (cmd.includes('vitest')) {
    return {
      name: 'vitest',
      command: command,
      resultFile: path.join(projectRoot, 'test-results', 'vitest-results.json'),
      configFiles: findConfigFiles(projectRoot, CONFIG_FILE_PATTERNS.vitest),
    };
  }

  if (cmd.includes('pytest')) {
    return {
      name: 'pytest',
      command: command,
      resultFile: path.join(projectRoot, 'test-results', 'pytest-results.xml'),
      configFiles: findConfigFiles(projectRoot, CONFIG_FILE_PATTERNS.pytest),
    };
  }

  // 默认使用 JUnit 作为通用格式
  return {
    name: 'junit',
    command: command,
    resultFile: path.join(projectRoot, 'test-results', 'junit.xml'),
    configFiles: [],
  };
}

/**
 * 从 package.json 检测框架
 */
function detectFromPackageJson(projectRoot: string): FrameworkInfo | null {
  const pkgPath = path.join(projectRoot, 'package.json');
  
  if (!fs.existsSync(pkgPath)) {
    return null;
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const testScript = pkg.scripts?.test || '';

    // 检查依赖
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    // Jest 优先
    if (deps.jest || testScript.includes('jest')) {
      return {
        name: 'jest',
        command: 'npx jest --json --outputFile=test-results/jest-results.json',
        resultFile: path.join(projectRoot, 'test-results', 'jest-results.json'),
        configFiles: findConfigFiles(projectRoot, CONFIG_FILE_PATTERNS.jest),
      };
    }

    // Vitest
    if (deps.vitest || testScript.includes('vitest')) {
      return {
        name: 'vitest',
        command: 'npx vitest run --reporter=json --outputFile=test-results/vitest-results.json',
        resultFile: path.join(projectRoot, 'test-results', 'vitest-results.json'),
        configFiles: findConfigFiles(projectRoot, CONFIG_FILE_PATTERNS.vitest),
      };
    }

    // 使用 test script
    if (testScript) {
      return {
        name: 'jest', // 默认假设为 Jest 兼容格式
        command: `npm test -- --json --outputFile=test-results/jest-results.json`,
        resultFile: path.join(projectRoot, 'test-results', 'jest-results.json'),
        configFiles: findConfigFiles(projectRoot, CONFIG_FILE_PATTERNS.jest),
      };
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * 从配置文件检测框架
 */
function detectFromConfigFiles(projectRoot: string): FrameworkInfo | null {
  // Jest 配置文件
  const jestConfigs = findConfigFiles(projectRoot, CONFIG_FILE_PATTERNS.jest);
  if (jestConfigs.length > 0) {
    return {
      name: 'jest',
      command: 'npx jest --json --outputFile=test-results/jest-results.json',
      resultFile: path.join(projectRoot, 'test-results', 'jest-results.json'),
      configFiles: jestConfigs,
    };
  }

  // Vitest 配置文件
  const vitestConfigs = findConfigFiles(projectRoot, CONFIG_FILE_PATTERNS.vitest);
  if (vitestConfigs.length > 0) {
    return {
      name: 'vitest',
      command: 'npx vitest run --reporter=json --outputFile=test-results/vitest-results.json',
      resultFile: path.join(projectRoot, 'test-results', 'vitest-results.json'),
      configFiles: vitestConfigs,
    };
  }

  return null;
}

/**
 * 检测 Python pytest 框架
 */
function detectPythonFramework(projectRoot: string): FrameworkInfo | null {
  const pyprojectPath = path.join(projectRoot, 'pyproject.toml');
  const pytestIniPath = path.join(projectRoot, 'pytest.ini');

  if (fs.existsSync(pyprojectPath) || fs.existsSync(pytestIniPath)) {
    return {
      name: 'pytest',
      command: 'pytest --junitxml=test-results/pytest-results.xml',
      resultFile: path.join(projectRoot, 'test-results', 'pytest-results.xml'),
      configFiles: fs.existsSync(pyprojectPath) ? [pyprojectPath] : [pytestIniPath],
    };
  }

  return null;
}

/**
 * 查找配置文件
 */
function findConfigFiles(projectRoot: string, patterns: string[]): string[] {
  const found: string[] = [];

  for (const pattern of patterns) {
    const fullPath = path.join(projectRoot, pattern);
    if (fs.existsSync(fullPath)) {
      found.push(fullPath);
    }
  }

  return found;
}