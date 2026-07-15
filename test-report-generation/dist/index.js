"use strict";
/**
 * 测试报告生成 Skill - 主入口
 * @module index
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTestReport = generateTestReport;
const detector_1 = require("./detector");
const jest_vitest_1 = require("./parsers/jest-vitest");
const junit_xml_1 = require("./parsers/junit-xml");
const markdown_1 = require("./generator/markdown");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
/**
 * 生成测试报告
 */
async function generateTestReport(options = {}) {
    try {
        const projectRoot = process.cwd();
        let testResult;
        // 解析模式：指定了结果文件
        if (options.resultFile) {
            testResult = await parseExistingResult(options.resultFile);
        }
        // 执行模式：运行测试
        else {
            const framework = await (0, detector_1.detectTestFramework)(projectRoot);
            if (!framework) {
                return {
                    success: false,
                    errors: ['无法检测到测试框架，请手动指定 testCommand 或 resultFile']
                };
            }
            testResult = await executeAndParse(framework, options);
        }
        // 生成报告
        const reportContent = (0, markdown_1.generateMarkdownReport)(testResult, options);
        // 写入文件
        const reportPath = await saveReport(reportContent, options);
        // 返回结果
        const topFailures = testResult.testCases
            .filter(tc => tc.status === 'failed')
            .slice(0, 3)
            .map(tc => ({ name: tc.name, message: tc.error?.message || '未知错误' }));
        return {
            success: testResult.summary.failed === 0,
            reportPath,
            summary: testResult.summary,
            topFailures: topFailures.length > 0 ? topFailures : undefined
        };
    }
    catch (error) {
        return {
            success: false,
            errors: [error instanceof Error ? error.message : String(error)]
        };
    }
}
async function parseExistingResult(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    if ((0, jest_vitest_1.validateJestVitestJson)(content)) {
        return (0, jest_vitest_1.parseJestVitestJson)(content);
    }
    if ((0, junit_xml_1.validateJUnitXml)(content)) {
        return (0, junit_xml_1.parseJUnitXml)(content);
    }
    throw new Error('无法解析结果文件：格式不支持或文件损坏');
}
async function executeAndParse(framework, options) {
    const { execSync } = require('child_process');
    const command = options.testCommand || framework.command;
    try {
        execSync(command, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        });
    }
    catch (error) {
        // 测试失败是正常情况，继续解析结果
        if (!error.stdout && !error.stderr) {
            throw new Error(`测试命令执行失败: ${error.message}`);
        }
    }
    // 查找结果文件
    const resultFile = await findResultFile();
    if (resultFile) {
        return parseExistingResult(resultFile);
    }
    throw new Error('测试执行完成但未找到结果文件');
}
async function findResultFile() {
    const candidates = [
        'test-results.json',
        'test-report.json',
        'junit.xml',
        'test-results.xml'
    ];
    for (const file of candidates) {
        try {
            await fs.access(file);
            return file;
        }
        catch { }
    }
    return null;
}
async function saveReport(content, options) {
    const reportsDir = options.outputPath || 'reports';
    await fs.mkdir(reportsDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `test-report-${timestamp}.md`;
    const reportPath = path.join(reportsDir, filename);
    await fs.writeFile(reportPath, content, 'utf-8');
    return reportPath;
}
// 导出所有公共 API
__exportStar(require("./types"), exports);
__exportStar(require("./detector"), exports);
__exportStar(require("./parsers/jest-vitest"), exports);
__exportStar(require("./parsers/junit-xml"), exports);
__exportStar(require("./generator/markdown"), exports);
