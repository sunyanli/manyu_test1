/**
 * 测试框架检测器
 * @module detector
 */

import { DetectedFramework } from './types';

const FRAMEWORK_PATTERNS = {
  jest: {
    configFiles: ['jest.config.js', 'jest.config.ts', 'jest.config.json'],
    packageScript: 'test',
    command: 'npm test -- --json --outputFile=test-results.json',
    resultFormat: 'jest-json' as const
  },
  vitest: {
    configFiles: ['vitest.config.ts', 'vitest.config.js', 'vite.config.ts'],
    packageScript: 'test',
    command: 'npx vitest run --reporter=json --outputFile=test-results.json',
    resultFormat: 'jest-json' as const
  }
};

export async function detectTestFramework(projectRoot: string): Promise<DetectedFramework | null> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // 检查 package.json
    const packageJsonPath = path.join(projectRoot, 'package.json');
    let packageJson: any = {};
    
    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      packageJson = JSON.parse(content);
    } catch {
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
      } catch {}
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
      } catch {}
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
  } catch {
    return null;
  }
}