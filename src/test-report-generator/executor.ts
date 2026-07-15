/**
 * 测试执行管理器
 * 实现 FR1.3 执行模式
 */

import * as fs from 'fs';
import * as path from 'path';
import * as childProcess from 'child_process';
import { promisify } from 'util';
import { FrameworkInfo } from './detector';

const execAsync = promisify(childProcess.exec);

export interface ExecutionResult {
  success: boolean;
  resultFile?: string;
  error?: string;
  stdout?: string;
  stderr?: string;
}

/**
 * 执行测试并收集结果
 */
export async function executeTests(
  framework: FrameworkInfo,
  projectRoot: string
): Promise<ExecutionResult> {
  // 确保结果目录存在
  const resultDir = path.dirname(framework.resultFile);
  if (!fs.existsSync(resultDir)) {
    fs.mkdirSync(resultDir, { recursive: true });
  }

  try {
    // 执行测试命令
    const { stdout, stderr } = await execAsync(framework.command, {
      cwd: projectRoot,
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      timeout: 600000, // 10 minutes timeout
      env: {
        ...process.env,
        // 禁用颜色输出
        NO_COLOR: '1',
        FORCE_COLOR: '0',
      },
    });

    // 检查结果文件是否生成
    if (!fs.existsSync(framework.resultFile)) {
      // 尝试常见的替代路径
      const altPaths = [
        path.join(projectRoot, 'coverage', 'coverage-final.json'),
        path.join(projectRoot, 'test-results.json'),
        path.join(projectRoot, 'junit.xml'),
      ];

      for (const altPath of altPaths) {
        if (fs.existsSync(altPath)) {
          return {
            success: true,
            resultFile: altPath,
            stdout,
            stderr,
          };
        }
      }

      return {
        success: false,
        error: '测试执行完成但结果文件未生成',
        stdout,
        stderr,
      };
    }

    return {
      success: true,
      resultFile: framework.resultFile,
      stdout,
      stderr,
    };
  } catch (error: any) {
    // 即使命令返回非零退出码，结果文件可能仍然存在
    //（例如测试失败但结果已写入）
    if (fs.existsSync(framework.resultFile)) {
      return {
        success: true,
        resultFile: framework.resultFile,
        error: error.message,
        stdout: error.stdout,
        stderr: error.stderr,
      };
    }

    // 检查是否是命令不存在
    if (error.code === 'ENOENT') {
      return {
        success: false,
        error: `测试命令未找到: ${framework.command}`,
        stdout: error.stdout,
        stderr: error.stderr,
      };
    }

    // 超时错误
    if (error.killed) {
      return {
        success: false,
        error: '测试执行超时（超过10分钟）',
        stdout: error.stdout,
        stderr: error.stderr,
      };
    }

    return {
      success: false,
      error: error.message || '测试执行失败',
      stdout: error.stdout,
      stderr: error.stderr,
    };
  }
}

/**
 * 检查测试是否可执行
 */
export function checkTestEnvironment(projectRoot: string): {
  ready: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  // 检查 package.json 或 pyproject.toml
  const pkgJson = path.join(projectRoot, 'package.json');
  const pyproject = path.join(projectRoot, 'pyproject.toml');

  if (!fs.existsSync(pkgJson) && !fs.existsSync(pyproject)) {
    missing.push('项目配置文件 (package.json 或 pyproject.toml)');
  }

  // 检查 node_modules (Node.js 项目)
  if (fs.existsSync(pkgJson)) {
    const nodeModules = path.join(projectRoot, 'node_modules');
    if (!fs.existsSync(nodeModules)) {
      missing.push('node_modules (请先执行 npm install)');
    }
  }

  return {
    ready: missing.length === 0,
    missing,
  };
}