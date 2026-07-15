/**
 * 测试执行器
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { TestReportConfig, TestReportError, ErrorCodes } from './types/index';
import { FrameworkDetector, FrameworkInfo } from './framework-detector';

const execAsync = promisify(exec);

export class TestExecutor {
  constructor(
    private detector: FrameworkDetector,
    private config: TestReportConfig
  ) {}

  /**
   * 执行测试并返回结果文件路径
   */
  async execute(): Promise<{ resultFile: string; framework: FrameworkInfo }> {
    const projectRoot = this.config.projectRoot || process.cwd();
    
    // 检测框架
    const frameworkInfo = await this.detector.detect(projectRoot);
    if (!frameworkInfo) {
      throw new TestReportError(
        '无法检测到测试框架，请手动指定 test_command',
        ErrorCodes.FRAMEWORK_NOT_DETECTED
      );
    }

    // 获取测试命令
    const command = this.config.testCommand || frameworkInfo.command;
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: projectRoot,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });

      // 返回结果文件路径
      const resultFile = this.getResultFilePath(frameworkInfo.framework);
      
      return {
        resultFile,
        framework: frameworkInfo,
      };
    } catch (error: any) {
      // 测试执行失败（用例失败）不应抛出异常
      // 只有命令无法运行时才抛出
      if (error.code === 'ENOENT') {
        throw new TestReportError(
          `测试命令执行失败: ${error.message}`,
          ErrorCodes.TEST_EXECUTION_FAILED,
          error
        );
      }
      
      // 测试有失败用例，但命令执行成功
      const resultFile = this.getResultFilePath(frameworkInfo.framework);
      return {
        resultFile,
        framework: frameworkInfo,
      };
    }
  }

  private getResultFilePath(framework: string): string {
    switch (framework) {
      case 'jest':
      case 'vitest':
        return 'test-results.json';
      case 'pytest':
        return 'junit.xml';
      default:
        return 'test-results.json';
    }
  }
}