/**
 * Markdown 测试报告生成器
 */

const fs = require('fs');
const path = require('path');

class ReportGenerator {
  constructor(config = {}) {
    this.config = {
      outputFormat: config.outputFormat || 'markdown',
      outputPath: config.outputPath || 'reports/',
      failThreshold: config.failThreshold || null,
      ...config
    };
  }

  /**
   * 生成测试报告
   */
  generate(testResult) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `test-report-${timestamp}.md`;
    const filepath = path.join(this.config.outputPath, filename);
    
    // 确保输出目录存在
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const content = this.generateMarkdown(testResult);
    fs.writeFileSync(filepath, content, 'utf-8');
    
    return {
      path: filepath,
      summary: testResult.summary,
      hasFailures: testResult.summary.failed > 0,
      topFailures: this.extractTopFailures(testResult)
    };
  }

  /**
   * 生成 Markdown 内容
   */
  generateMarkdown(result) {
    const sections = [
      this.generateHeader(result),
      this.generateSummary(result),
      this.generateFailures(result),
      this.generateDetails(result),
      this.generateCoverage(result),
      this.generateAppendix(result)
    ];
    
    return sections.filter(Boolean).join('\n\n');
  }

  /**
   * 报告头
   */
  generateHeader(result) {
    const projectName = process.cwd().split('/').pop();
    const timestamp = new Date().toISOString();
    
    return `# 测试报告

**项目**: ${projectName}  
**生成时间**: ${timestamp}  
**测试框架**: ${result.framework || 'Unknown'}  
**工具版本**: v1.0.0`;
  }

  /**
   * 结果摘要
   */
  generateSummary(result) {
    const s = result.summary;
    const icon = s.failed === 0 ? '✅' : '❌';
    const threshold = this.config.failThreshold;
    const thresholdMet = threshold ? s.passRate >= threshold : null;
    
    return `## 📊 结果摘要

| 指标 | 数值 |
|------|------|
| 总用例 | ${s.total} |
| 通过 | ${s.passed} ✅ |
| 失败 | ${s.failed} ${s.failed > 0 ? '❌' : ''} |
| 跳过 | ${s.skipped} |
| 通过率 | ${(s.passRate * 100).toFixed(1)}% |
| 耗时 | ${this.formatDuration(s.duration)} |

**整体结论**: ${icon} ${s.failed === 0 ? '所有测试通过' : `有 ${s.failed} 个测试失败`}${
      threshold !== null ? `\n**阈值检查**: ${thresholdMet ? '✅ 达标' : '❌ 未达标'} (阈值: ${(threshold * 100).toFixed(0)}%)` : ''
    }`;
  }

  /**
   * 失败用例分析
   */
  generateFailures(result) {
    const failures = this.collectFailures(result);
    if (failures.length === 0) return null;
    
    const lines = [`## ❌ 失败用例分析 (共 ${failures.length} 个)`];
    
    for (let i = 0; i < Math.min(failures.length, 50); i++) {
      const f = failures[i];
      lines.push(`\n### ${i + 1}. ${f.name}`);
      lines.push(`**文件**: \`${f.file}\``);
      if (f.error) {
        lines.push(`\n**错误信息**:\n\`\`\`\n${f.error}\n\`\`\``);
      }
      if (f.stack) {
        lines.push(`\n**堆栈摘要**:\n\`\`\`\n${f.stack}\n\`\`\``);
      }
    }
    
    if (failures.length > 50) {
      lines.push(`\n_... 还有 ${failures.length - 50} 个失败用例未展示_`);
    }
    
    return lines.join('\n');
  }

  /**
   * 用例明细
   */
  generateDetails(result) {
    const files = result.testFiles || [];
    if (files.length === 0) return null;
    
    const lines = ['## 📋 用例明细'];
    let totalShown = 0;
    const maxCases = 200;
    
    for (const file of files) {
      const testLines = [`\n### ${file.file}`];
      
      for (const test of (file.tests || [])) {
        if (totalShown >= maxCases) {
          testLines.push(`\n_已截断：超过 ${maxCases} 条，仅展示部分结果_`);
          return lines.join('\n') + '\n' + testLines.join('\n');
        }
        
        const statusIcon = this.getStatusIcon(test.status);
        testLines.push(`- ${statusIcon} ${test.name} (${this.formatDuration(test.duration)})`);
        totalShown++;
      }
      
      lines.push(testLines.join('\n'));
    }
    
    return lines.join('\n');
  }

  /**
   * 覆盖率章节
   */
  generateCoverage(result) {
    const coverage = result.coverage;
    if (!coverage) return `\n## 📈 覆盖率\n\n_未获取覆盖率数据_`;
    
    return `## 📈 覆盖率

| 类型 | 覆盖率 |
|------|--------|
| 语句 | ${coverage.statements || '未获取'} |
| 分支 | ${coverage.branches || '未获取'} |
| 函数 | ${coverage.functions || '未获取'} |
| 行 | ${coverage.lines || '未获取'} |`;
  }

  /**
   * 附录
   */
  generateAppendix(result) {
    return `## 📎 附录

- **生成工具**: test-report-generator v1.0.0
- **框架**: ${result.framework || 'Unknown'}
- **元数据**: ${JSON.stringify(result.metadata || {}, null, 2)}`;
  }

  /**
   * 收集所有失败用例
   */
  collectFailures(result) {
    const failures = [];
    
    for (const file of (result.testFiles || [])) {
      for (const test of (file.tests || [])) {
        if (test.status === 'failed') {
          failures.push({
            name: test.name || test.fullName,
            file: file.file,
            error: test.error,
            stack: test.stack
          });
        }
      }
    }
    
    return failures;
  }

  /**
   * 提取最关键的失败（1-3条）
   */
  extractTopFailures(result) {
    const failures = this.collectFailures(result);
    return failures.slice(0, 3).map(f => ({
      name: f.name,
      file: f.file,
      error: f.error
    }));
  }

  /**
   * 格式化时长
   */
  formatDuration(ms) {
    if (!ms || ms < 0) return '0ms';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  /**
   * 获取状态图标
   */
  getStatusIcon(status) {
    const icons = {
      passed: '✅',
      failed: '❌',
      skipped: '⏭️',
      unknown: '❓'
    };
    return icons[status] || '❓';
  }
}

module.exports = ReportGenerator;