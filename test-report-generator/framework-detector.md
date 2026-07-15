# 测试框架检测逻辑

## 检测优先级

按照以下顺序检测项目使用的测试框架：

### 1. 用户显式指定
如果用户通过 `test_command` 参数显式指定命令，直接使用该命令。

示例：
- `npm test`
- `yarn test`
- `pnpm test`
- `npx jest`
- `npx vitest run`

### 2. 项目配置文件检测

#### 2.1 package.json scripts
检查 `package.json` 中的 `scripts.test` 字段：
```json
{
  "scripts": {
    "test": "jest"
  }
}
```

#### 2.2 框架特征文件

| 框架 | 特征文件 |
|------|----------|
| Jest | `jest.config.js`, `jest.config.ts`, `jest.config.json`, `jest.config.mjs`, `jest.config.cjs` |
| Vitest | `vitest.config.ts`, `vitest.config.js`, `vitest.config.mjs`, 或 `vite.config.ts` 中包含 `test` 配置 |
| pytest | `pytest.ini`, `pyproject.toml` 中的 `[tool.pytest]`, `setup.cfg` 中的 `[tool:pytest]` |

#### 2.3 依赖检测
检查 `package.json` 的 `devDependencies`：
- `jest` → Jest 框架
- `vitest` → Vitest 框架
- `@jest/core` → Jest 框架
- `@vitest/ui` → Vitest 框架

## JSON Reporter 配置

### Jest
Jest 需要 `--json` 和 `--outputFile` 参数生成 JSON 输出：

```bash
npx jest --json --outputFile=test-results.json
```

或配置 `jest.config.js`：
```javascript
module.exports = {
  reporters: ['default', ['json', { outputFile: 'test-results.json' }]]
};
```

### Vitest
Vitest 使用 `--reporter=json` 参数：

```bash
npx vitest run --reporter=json --outputFile=test-results.json
```

或配置 `vitest.config.ts`：
```typescript
export default defineConfig({
  test: {
    reporters: ['json'],
    outputFile: 'test-results.json'
  }
});
```

## 检测流程伪代码

```
function detectTestFramework(projectPath):
    // 1. 检查 package.json
    packageJson = readJson(projectPath + 'package.json')
    
    if packageJson.scripts?.test:
        testScript = packageJson.scripts.test
        if containsJest(testScript): return { framework: 'jest', command: testScript }
        if containsVitest(testScript): return { framework: 'vitest', command: testScript }
    
    // 2. 检查特征文件
    if exists(projectPath + 'jest.config.*'): 
        return { framework: 'jest', command: 'npx jest' }
    
    if exists(projectPath + 'vitest.config.*') or 
       (exists(projectPath + 'vite.config.*') and hasVitestConfig()):
        return { framework: 'vitest', command: 'npx vitest run' }
    
    // 3. 检查依赖
    if packageJson.devDependencies?.jest:
        return { framework: 'jest', command: 'npx jest' }
    
    if packageJson.devDependencies?.vitest:
        return { framework: 'vitest', command: 'npx vitest run' }
    
    // 4. 未检测到
    return { framework: 'unknown', command: null }
```

## 执行命令生成

根据检测到的框架，生成带 JSON 输出的测试命令：

| 框架 | 执行命令 |
|------|----------|
| Jest | `npx jest --json --outputFile=.test-results/jest-results.json` |
| Vitest | `npx vitest run --reporter=json --outputFile=.test-results/vitest-results.json` |

## 错误处理

### 未检测到测试框架
返回错误信息，引导用户：
```
❌ 未检测到测试框架

请确保项目满足以下条件之一：
- package.json 中定义了 test 脚本
- 存在 jest.config.* 或 vitest.config.* 配置文件
- 已安装 jest 或 vitest 依赖

或者通过 test_command 参数显式指定测试命令。
```

### 测试执行失败
区分两种情况：
1. **命令无法运行**：环境配置问题，不生成报告
2. **用例失败**：正常情况，生成包含失败信息的报告