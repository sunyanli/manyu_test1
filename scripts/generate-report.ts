#!/usr/bin/env ts-node

/**
 * 测试报告生成器 - 命令行工具
 */

import { TestReportGenerator, parseAndGenerateReport } from '../index';
import * as path from 'path';

async function main() {
  const args = process.argv.slice(2);
  
  // 解析参数
  const config: any = {
    outputFormat: 'markdown',
    outputPath: 'reports/'
  };

  let resultFile: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--output' || arg === '-o') {
      config.outputPath = args[++i];
    } else if (arg === '--threshold' || arg === '-t') {
      config.failThreshold = parseFloat(args[++i]);
    } else if (arg === '--parse' || arg === '-p') {
      resultFile = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      return;
    }
  }

  try {
    let result;
    
    if (resultFile) {
      // 解析模式
      console.log(`📄 解析结果文件: ${resultFile}`);
      result = await parseAndGenerateReport(resultFile, config);
    } else {
      // 执行模式
      console.log('🧪 执行测试...');
      const generator = new TestReportGenerator(config);
      result = await generator.runAndGenerate();
    }

    // 输出结果
    console.log('\n' + '='.repeat(50));
    console.log('📊 测试报告已生成');
    console.log('='.repeat(50));
    console.log(`📁 报告路径: ${result.reportPath}`);
    console.log(`📊 用例总数: ${result.summary.total}`);
    console.log(`✅ 通过: ${result.summary.passed}`);
    console.log(`❌ 失败: ${result.summary.failed}`);
    console.log(`📈 通过率: ${result.summary.passRate.toFixed(1)}%`);

    if (result.topFailures.length > 0) {
      console.log('\n⚠️  关键失败用例:');
      result.topFailures.forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.name}`);
        console.log(`     文件: ${f.file}`);
        console.log(`     错误: ${f.message.substring(0, 100)}`);
      });
    }

    // 根据状态返回退出码
    process.exit(result.summary.status === 'passed' ? 0 : 1);
    
  } catch (error: any) {
    console.error('❌ 生成报告失败:', error.message);
    if (error.details) {
      console.error('详情:', JSON.stringify(error.details, null, 2));
    }
    process.exit(2);
  }
}

function printUsage() {
  console.log(`
测试报告生成器 - 命令行工具

用法:
  ts-node generate-report.ts [选项]

选项:
  -o, --output <目录>    报告输出目录 (默认: reports/)
  -t, --threshold <数值> 通过率阈值，低于此值标记为不达标
  -p, --parse <文件>     解析已有结果文件（不运行测试）
  -h, --help             显示帮助信息

示例:
  # 执行测试并生成报告
  ts-node generate-report.ts

  # 解析已有结果
  ts-node generate-report.ts --parse test-results/jest-results.json

  # 指定输出目录和阈值
  ts-node generate-report.ts -o qa-reports/ -t 80
`);
}

main().catch(console.error);