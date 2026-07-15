"use strict";
/**
 * 测试框架检测器
 * @module detector
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectTestFramework = detectTestFramework;
const FRAMEWORK_PATTERNS = {
    jest: {
        configFiles: ['jest.config.js', 'jest.config.ts', 'jest.config.json'],
        packageScript: 'test',
        command: 'npm test -- --json --outputFile=test-results.json',
        resultFormat: 'jest-json'
    },
    vitest: {
        configFiles: ['vitest.config.ts', 'vitest.config.js', 'vite.config.ts'],
        packageScript: 'test',
        command: 'npx vitest run --reporter=json --outputFile=test-results.json',
        resultFormat: 'jest-json'
    }
};
async function detectTestFramework(projectRoot) {
    try {
        const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        // 检查 package.json
        const packageJsonPath = path.join(projectRoot, 'package.json');
        let packageJson = {};
        try {
            const content = await fs.readFile(packageJsonPath, 'utf-8');
            packageJson = JSON.parse(content);
        }
        catch {
            // 无 package.json，非 Node 项目
            return null;
        }
        // 检测 Jest
        for (const configFile of FRAMEWORK_PATTERNS.jest.configFiles) {
            try {
                await fs.access(path.join(projectRoot, configFile));
                return {
                    name: 'jest',
                    command: packageJson.scripts?.test || FRAMEWORK_PATTERNS.jest.command,
                    configPath: configFile,
                    resultFormat: 'jest-json'
                };
            }
            catch { }
        }
        // 检测 Vitest
        for (const configFile of FRAMEWORK_PATTERNS.vitest.configFiles) {
            try {
                await fs.access(path.join(projectRoot, configFile));
                return {
                    name: 'vitest',
                    command: packageJson.scripts?.test || FRAMEWORK_PATTERNS.vitest.command,
                    configPath: configFile,
                    resultFormat: 'jest-json'
                };
            }
            catch { }
        }
        // 检查依赖中的测试框架
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        if (deps?.jest) {
            return { name: 'jest', command: 'npm test', resultFormat: 'jest-json' };
        }
        if (deps?.vitest) {
            return { name: 'vitest', command: 'npx vitest run', resultFormat: 'jest-json' };
        }
        return null;
    }
    catch {
        return null;
    }
}
