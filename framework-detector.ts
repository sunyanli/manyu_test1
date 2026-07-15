/**
 * 测试框架识别与命令检测模块
 */

import * as fs from 'fs';
import * as path from 'path';
import { FrameworkInfo, TestFramework, FrameworkDetectionError } from './types';

interface ConfigFilePatterns {
  jest: string[];
  vitest: string[];
  pytest: string[];
}

const CONFIG_PATTERNS: ConfigFilePatterns = {
  jest: [
    'jest.config.js',
    'jest.config.ts',
    'jest.config.json',
    'jest.config.mjs',
    'jest.config.cjs'
  ],
  vitest: [
    'vitest.config.ts',
    'vitest.config.js',
    'vitest.config.mjs',
    'vite.config.ts',
    'vite.config.js'
  ],
  pytest: [
    'pytest.ini',
    'pyproject.toml',
    'setup.cfg',
    'tox.ini'
  ]
};

interface PackageManagerScripts {
  test?: string;
  'test:ci'?: string;
  [key: string]: string | undefined;
}

/**
 * 检测项目使用的测试框架
 */
export async function detectTestFramework(projectRoot: string = process.cwd()): Promise<FrameworkInfo> {
  // 优先级 1: 检查 package.json scripts
  const packageJsonResult = await detectFromPackageJson(projectRoot);
  if (packageJsonResult) {
    return packageJsonResult;
  }

  // 优先级 2: 检查配置文件
  const configResult = await detectFromConfigFiles(projectRoot);
  if (configResult) {
    return configResult;
  }

  // 优先级 3: 检查 Python 项目
  const pytestResult = await detectPytest(projectRoot);
  if (pytestResult) {
    return pytestResult;
  }

  throw new FrameworkDetectionError(
    '无法自动检测测试框架，请手动指定 test_command',
    { projectRoot }
  );
}

/**
 * 从 package.json 检测测试框架
 */
async function detectFromPackageJson(projectRoot: string): Promise<FrameworkInfo | null> {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(content) as { scripts?: PackageManagerScripts; dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    const scripts = packageJson.scripts || {};
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    // 检查是否包含 vitest
    if (deps.vitest) {
      return {
        name: 'vitest',
        version: deps.vitest,
        testCommand: scripts.test?.includes('vitest') 
          ? scripts.test 
          : 'vitest run --reporter=json',
        resultFormat: 'json'
      };
    }

    // 检查是否包含 jest
    if (deps.jest) {
      return {
        name: 'jest',
        version: deps.jest,
        testCommand: scripts.test?.includes('jest') 
          ? scripts.test + ' --json' 
          : 'npx jest --json',
        resultFormat: 'json'
      };
    }

    // 有 test script 但未识别框架
    if (scripts.test) {
      const command = scripts.test;
      if (command.includes('vitest')) {
        return {
          name: 'vitest',
          testCommand: `${command} --reporter=json`,
          resultFormat: 'json'
        };
      }
      if (command.includes('jest')) {
        return {
          name: 'jest',
          testCommand: `${command} --json`,
          resultFormat: 'json'
        };
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * 从配置文件检测测试框架
 */
async function detectFromConfigFiles(projectRoot: string): Promise<FrameworkInfo | null> {
  // 检查 Vitest 配置
  for (const configName of CONFIG_PATTERNS.vitest) {
    const configPath = path.join(projectRoot, configName);
    if (fs.existsSync(configPath)) {
      return {
        name: 'vitest',
        configPath,
        testCommand: 'vitest run --reporter=json',
        resultFormat: 'json'
      };
    }
  }

  // 检查 Jest 配置
  for (const configName of CONFIG_PATTERNS.jest) {
    const configPath = path.join(projectRoot, configName);
    if (fs.existsSync(configPath)) {
      return {
        name: 'jest',
        configPath,
        testCommand: 'npx jest --json',
        resultFormat: 'json'
      };
    }
  }

  return null;
}

/**
 * 检测 pytest 框架
 */
async function detectPytest(projectRoot: string): Promise<FrameworkInfo | null> {
  for (const configName of CONFIG_PATTERNS.pytest) {
    const configPath = path.join(projectRoot, configName);
    if (fs.existsSync(configPath)) {
      return {
        name: 'pytest',
        configPath,
        testCommand: 'pytest --junit-xml=test-results/junit.xml',
        resultFormat: 'junit-xml'
      };
    }
  }

  // 检查是否有 Python 文件和 requirements.txt
  const hasPythonFiles = await checkPythonFiles(projectRoot);
  if (hasPythonFiles) {
    return {
      name: 'pytest',
      testCommand: 'pytest --junit-xml=test-results/junit.xml',
      resultFormat: 'junit-xml'
    };
  }

  return null;
}

/**
 * 检查项目是否包含 Python 文件
 */
async function checkPythonFiles(projectRoot: string): Promise<boolean> {
  const pythonIndicators = [
    'requirements.txt',
    'setup.py',
    'Pipfile',
    'poetry.lock'
  ];

  for (const indicator of pythonIndicators) {
    if (fs.existsSync(path.join(projectRoot, indicator))) {
      return true;
    }
  }

  return false;
}

/**
 * 根据文件扩展名推断框架
 */
export function inferFrameworkFromFile(filePath: string): TestFramework {
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath).toLowerCase();

  if (basename.includes('jest') || ext === '.js' || ext === '.ts') {
    if (basename.includes('jest') || basename.includes('vitest')) {
      return basename.includes('vitest') ? 'vitest' : 'jest';
    }
  }

  if (basename.includes('junit') || basename.includes('pytest')) {
    return 'junit';
  }

  if (ext === '.xml') {
    return 'junit';
  }

  if (ext === '.json') {
    return 'jest';
  }

  return 'unknown';
}

/**
 * 构建测试执行命令
 */
export function buildTestCommand(
  framework: TestFramework,
  userCommand?: string,
  resultFilePath?: string
): string {
  if (userCommand) {
    // 用户指定命令，添加 JSON 输出参数
    return enhanceCommandForJsonOutput(userCommand, framework);
  }

  switch (framework) {
    case 'jest':
      return `npx jest --json --outputFile=${resultFilePath || 'test-results/jest-results.json'}`;
    
    case 'vitest':
      return `npx vitest run --reporter=json${resultFilePath ? ` --outputFile=${resultFilePath}` : ''}`;
    
    case 'pytest':
      return `pytest --junit-xml=${resultFilePath || 'test-results/junit.xml'}`;
    
    default:
      return 'npm test';
  }
}

/**
 * 为用户命令添加 JSON 输出支持
 */
function enhanceCommandForJsonOutput(command: string, framework: TestFramework): string {
  switch (framework) {
    case 'jest':
      return command.includes('--json') ? command : `${command} --json`;
    
    case 'vitest':
      return command.includes('--reporter=json') ? command : `${command} --reporter=json`;
    
    case 'pytest':
      return command.includes('--junit-xml') ? command : `${command} --junit-xml=test-results/junit.xml`;
    
    default:
      return command;
  }
}

/**
 * 查找测试结果文件
 */
export async function findResultFiles(projectRoot: string): Promise<string[]> {
  const resultDirs = ['test-results', 'coverage', 'reports', 'test-report'];
  const resultFiles: string[] = [];

  for (const dir of resultDirs) {
    const dirPath = path.join(projectRoot, dir);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        if (file.endsWith('.json') || file.endsWith('.xml')) {
          resultFiles.push(filePath);
        }
      }
    }
  }

  // 检查根目录下的结果文件
  const rootFiles = ['jest-results.json', 'test-results.json', 'junit.xml', 'test-report.xml'];
  for (const file of rootFiles) {
    const filePath = path.join(projectRoot, file);
    if (fs.existsSync(filePath)) {
      resultFiles.push(filePath);
    }
  }

  return resultFiles;
}