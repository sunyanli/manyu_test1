/**
 * 测试执行管理器
 * 实现 FR1.3 执行模式
 */

import * as fs from 'fs';
import * as path from 'path';
import * as childProcess from 'child_process';
import { promisify } from 'util';
import { FrameworkDetector, DetectedFramework } from './framework-detector';
import { TestReportConfig, TestReportError, ErrorCodes } from './types/index';

const execAsync = promisify(childProcess.exec);

export interface ExecutionResult {
  resultFile: string;
  framework: DetectedFramework;
  stdout?: string;
  stderr?: string;
}

export class TestExecutor {
  private detector: FrameworkDetector;
  private config: TestReportConfig;

  constructor(detector: FrameworkDetector, config: TestReportConfig) {
    this.detector = detector;
    this.config = config;
  }

  /**
   * 执行测试并返回结果文件路径
   */
  async execute(): Promise<ExecutionResult> {
    const projectRoot = this.config.projectRoot || process.cwd();
    
    // 检测框架
    const framework = this.detector.detect(this.config.testCommand);
    
    if (!framework) {
      throw new TestReportError(
        '无法检测测试框架，请通过 testCommand 参数显式指定测试命令',
        ErrorCodes.FRAMEWORK_NOT_DETECTED
      );
    }

    // 确保结果目录存在
    const resultDir = path.dirname(framework.resultFile);
    if (!fs.existsSync(resultDir)) {
      fs.mkdirSync(resultDir, { recursive: true });
    }

    try {
      // 执行测试命令
      const { stdout, stderr } = await execAsync(framework.command, {
        cwd: projectRoot,
        maxBuffer: 50 * 1024 * 1024,
        timeout: 600000, // 10 minutes
        env: {
          ...process.env,
          NO_COLOR: '1',
          FORCE_COLOR: '0',
        },
      });

      // 验证结果文件
      const resultFile = this.findResultFile(framework.resultFile, projectRoot);

      return {
        resultFile,
        framework,
        stdout,
        stderr,
      };
    } catch (error: any) {
      // 即使命令失败，结果文件可能仍然存在
      const resultFile = this.findResultFile(framework.resultFile, projectRoot);
      
      if (resultFile) {
        return {
          resultFile,
          framework,
          stdout: error.stdout,
          stderr: error.stderr,
        };
      }

      // 命令不存在
      if (error.code === 'ENOENT') {
        throw new TestReportError(
          `测试命令未找到: ${framework.command}`,
          ErrorCodes.TEST_EXECUTION_FAILED,
          error
        );
      }

      // 超时
      if (error.killed) {
        throw new TestReportError(
          '测试执行超时（超过10分钟）',
          ErrorCodes.TEST_EXECUTION_FAILED,
          error
        );
      }

      throw new TestReportError(
        `测试执行失败: ${error.message}`,
        ErrorCodes.TEST_EXECUTION_FAILED,
        error
      );
    }
  }

  /**
   * 查找结果文件，支持回退到常见路径
   */
  private findResultFile(expectedPath: string, projectRoot: string): string | null {
    // 检查预期路径
    if (fs.existsSync(expectedPath)) {
      return expectedPath;
    }

    // 尝试常见替代路径
    const altPaths = [
      path.join(projectRoot, 'test-results.json'),
      path.join(projectRoot, 'junit.xml'),
      path.join(projectRoot, 'coverage', 'coverage-final.json'),
      path.join(projectRoot, 'test-results', 'junit.xml'),
    ];

    for (const altPath of altPaths) {
      if (fs.existsSync(altPath)) {
        return altPath;
      }
    }

    return null;
  }
}