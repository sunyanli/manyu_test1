#!/usr/bin/env node
/**
 * 测试报告生成器 - 主入口
 */

const TestResultParser = require('./parser');
const ReportGenerator = require('./reportGenerator');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TestReportCLI {
  constructor() {
    this.parser = new TestResultParser();
    this.config = {
      testCommand: null,
      resultFile: null,
      outputFormat: 'markdown',
      outputPath: 'reports/',
      coverage: 'auto',
      failThreshold: null
    };
  }

  /**
   * 运行测试并生成报告
   */
  async run(options = {}) {
    this.config = { ...this.config, ...options };
    
    try {
      let resultFile = this.config.resultFile;
      
      // 执行模式：运行测试
      if (!resultFile) {
        resultFile = await this.executeTests();
      }
      
      // 解析结果
      const testResult = await this.parser.parse(resultFile);
      
      // 生成报告
      const generator = new ReportGenerator(this.config);
      const report = generator.generate(testResult);
      
      // 输出摘要
      this.printSummary(report);
      
      return report;
    } catch (error) {
      console.error(`❌ 错误: ${error.message}`);
      throw error;
    }
  }

  /**
   * 执行测试并收集结果
   */
  async executeTests() {
    const command = this.detectTestCommand();
    
    console.log(`🧪 执行测试: ${command}`);
    
    try {
      // Jest/Vitest: 输出 JSON
      const outputFile = 'test-results.json';
      const fullCommand = `${command} --json --outputFile=${outputFile}`;
      
      execSync(fullCommand, {
        stdio: 'pipe',
        cwd: process.cwd()
      });
      
      return path.resolve(outputFile);
    } catch (error) {
      // 测试失败时，结果文件可能仍存在
      const outputFile = path.resolve('test-results.json');
      if (fs.existsSync(outputFile)) {
        return outputFile;
      }
      throw new Error(`测试执行失败: ${error.message}`);
    }
  }

  /**
   * 检测测试命令
   */
  detectTestCommand() {
    if (this.config.testCommand) {
      return this.config.testCommand;
    }
    
    // 检查 package.json
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.scripts?.test) {
        return 'npm test';
      }
    }
    
    // 检查 pyproject.toml
    const pyproject = path.join(process.cwd(), 'pyproject.toml');
    if (fs.existsSync(pyproject)) {
      return 'pytest';
    }
    
    // 默认
    return 'npm test';
  }

  /**
   * 输出摘要
   */
  printSummary(report) {
    console.log('\n' + '='.repeat(50));
    console.log('📊 测试报告已生成');
    console.log('='.repeat(50));
    console.log(`路径: ${report.path}`);
    console.log(`\n摘要:`);
    console.log(`- 总用例: ${report.summary.total}`);
    console.log(`- 通过: ${report.summary.passed} ✅`);
    console.log(`- 失败: ${report.summary.failed} ${report.summary.failed > 0 ? '❌' : ''}`);
    console.log(`- 跳过: ${report.summary.skipped}`);
    console.log(`- 通过率: ${(report.summary.passRate * 100).toFixed(1)}%`);
    
    if (report.topFailures.length > 0) {
      console.log('\n关键失败:');
      report.topFailures.forEach((f, i) => {
        console.log(`${i + 1}. [${f.file}] ${f.name}`);
        if (f.error) {
          console.log(`   → ${f.error.substring(0, 100)}`);
        }
      });
    }
  }
}

// CLI 入口
async function main() {
  const cli = new TestReportCLI();
  
  const args = process.argv.slice(2);
  const options = {};
  
  // 解析参数
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--command' && args[i + 1]) {
      options.testCommand = args[++i];
    } else if (arg === '--file' && args[i + 1]) {
      options.resultFile = args[++i];
    } else if (arg === '--output' && args[i + 1]) {
      options.outputPath = args[++i];
    } else if (arg === '--threshold' && args[i + 1]) {
      options.failThreshold = parseFloat(args[++i]);
    } else if (!arg.startsWith('--')) {
      // 第一个非选项参数作为结果文件路径（解析模式）
      if (!options.resultFile) {
        options.resultFile = arg;
      }
    }
  }
  
  await cli.run(options);
}

module.exports = TestReportCLI;

if (require.main === module) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}