# Code Review Report — 每日待办事项功能

> **Review Date**: 2026-09-15
> **Reviewer**: AiWork (automated)
> **Skill**: dtazziboot-java-code-review (adapted for Vue/JS stack)
> **Design Spec**: `.agents/20260915-Goal_Help_users_reco/design.md`

---

## 1. Overview

本次变更为一个基于 Vue 3 + Vite 的前端演示应用新增了"每日待办事项"功能，核心能力为创建待办事项（F01）和查询待办列表（F02）。变更涉及 3 个源文件：

| 文件 | 类型 | 变更说明 |
|------|------|----------|
| `src/App.vue` | 修改 | 新增"待办事项"Tab 注册，引入 TabTodo 组件 |
| `src/api/index.js` | 修改 | 新增 `createTodoItem` 和 `listTodoItems` 两个 API 函数 |
| `src/components/TabTodo.vue` | 新增 | 待办事项完整 UI 组件（创建表单 + 状态筛选 + 列表展示） |

---

## 2. Review Scope — Execution Queue

| # | 文件路径 | 状态 | 说明 |
|---|----------|------|------|
| 1 | `src/App.vue` | ✅ reviewed | Tab 注册变更 |
| 2 | `src/api/index.js` | ✅ reviewed | API 客户端函数 |
| 3 | `src/components/TabTodo.vue` | ✅ reviewed | 新增待办事项组件 |
| — | `dist/*` | ⏭️ skip | 构建产物，非源码 |
| — | `node_modules/*` | ⏭️ skip | 第三方依赖，非源码 |
| — | `package-lock.json` | ⏭️ skip | 锁文件，自动生成 |

---

## 3. Functional Check (Step 2)

### 3.1 REQ Checklist

| REQ ID | 功能点 | 设计文档来源 | 关联文件 | 判定 |
|--------|--------|-------------|----------|------|
| F01 | 创建待办事项（必填：事项名称） | §5.1.3.1 创建待办事项 | `TabTodo.vue:82-103`, `api/index.js:57-59` | ✅ Pass |
| F02 | 待办事项列表展示 | §5.1.3.2 查询待办列表 | `TabTodo.vue:37-60`, `api/index.js:61-63` | ✅ Pass |
| F03 | 内部用户身份识别 | §6.4.1 账号体系方案 | `api/index.js:8-13` (X-Caller-Info) | ✅ Pass |
| R01 | 事项名称非空（trim 后） | §5.1.3.1 R01 | `TabTodo.vue:83-87` | ✅ Pass |
| R02 | 事项名称 ≤ 200 字符 | §5.1.3.1 R02 | `TabTodo.vue:11` (maxlength), `TabTodo.vue:88-91` | ✅ Pass |
| R04 | 仅查询当前用户待办 | §5.1.3.2 R04 | 后端职责，前端无对应逻辑 | N/A (后端) |
| R05 | 默认按创建时间倒序 | §5.1.3.2 R05 | 后端职责 | N/A (后端) |
| R06 | status 参数仅接受合法枚举值 | §5.1.3.2 R06 | `TabTodo.vue:29-34` (select 限定) | ✅ Pass |

### 3.2 Functional Issues

无 P0 功能不符项。所有前端职责范围内的功能点均已正确实现。

---

## 4. Readability Check (Step 3)

| 检查项 | 判定 | 说明 |
|--------|------|------|
| A1 命名规范 | ✅ Pass | 变量名语义清晰：`itemName`, `creating`, `createError`, `filterStatus`, `todoList` 等 |
| A2 函数长度 | ✅ Pass | `handleCreate` (22 行)、`fetchList` (12 行) 均简洁合理 |
| A3 组件结构 | ✅ Pass | `TabTodo.vue` 职责单一，template/script/style 分离清晰 |
| A4 注释/文档 | ⚠️ P2 | `api/index.js:57-63` 新增的 API 函数缺少 JSDoc 注释说明参数含义和返回值 |
| A5 魔法值 | ✅ Pass | 状态枚举值 `PENDING/COMPLETED/CANCELLED` 在 `statusLabel` 函数中集中映射，无散落魔法值 |
| A6 代码重复 | ✅ Pass | 无重复代码 |
| A7 与现有架构一致性 | ✅ Pass | Tab 注册方式、API 函数风格、组件结构与现有代码一致 |

**Readability Issues**: 1 × P2

---

## 5. Reliability Check (Step 4)

### 5.1 Reliability (G)

| 检查项 | 判定 | 说明 |
|--------|------|------|
| G1 超时设置 | ✅ Pass | `api/index.js:5` — axios 全局 timeout 10000ms |
| G2 错误处理 | ⚠️ P1 | 见下方 Issue #1 |
| G3 并发防抖 | ⚠️ P1 | 见下方 Issue #2 |
| G4 资源释放 | ✅ Pass | 无手动资源分配（无定时器/WebSocket 等需释放的资源） |
| G5 边界条件 | ✅ Pass | 空列表展示"暂无待办"、网络错误展示重试按钮 |

### 5.2 Security (S)

| 检查项 | 判定 | 说明 |
|--------|------|------|
| S1 XSS 防护 | ✅ Pass | Vue 模板 `{{ }}` 自动转义，无 `v-html` 使用 |
| S2 输入验证 | ✅ Pass | 前端 trim + 非空 + 长度校验，HTML maxlength 属性双重保障 |
| S3 敏感信息泄露 | ✅ Pass | 无硬编码密钥/令牌 |
| S4 CSRF/XSRF | N/A | 由后端/框架层处理 |

### 5.3 Issues Detail

#### Issue #1 — 响应拦截器缺少业务错误检测 [P1]

**文件**: `src/api/index.js:18-31`

**问题描述**: 响应拦截器仅处理 HTTP 错误状态码（走 `error` 回调）。如果后端返回 HTTP 200 但业务层失败（如 `{ result: "TODO_001", msg: "事项名称不能为空" }`），拦截器不会将其转换为 reject，而是直接返回该对象作为正常响应。

**影响**:
- `handleCreate` 中 `await createTodoItem(name)` 不会进入 `catch`，而是将错误对象当作成功响应处理
- `fetchList` 中 `res.data` 可能为 `undefined`，导致 `todoList` 被设为空数组但实际未加载数据
- 用户看到的是"空列表"而非有意义的错误提示

**建议修复**:
```javascript
api.interceptors.response.use(
  response => {
    const data = response.data
    // 如果后端使用 result 字段标识业务结果
    if (data && data.result && data.result !== 'OK') {
      return Promise.reject({ error_code: data.result, message: data.msg })
    }
    return data
  },
  error => { /* existing error handler */ }
)
```

**严重程度**: P1（Recommended）— 取决于后端实际错误返回模式。若后端使用 HTTP 4xx/5xx 返回业务错误，则此问题不存在。

---

#### Issue #2 — 创建按钮缺少显式防抖 [P1]

**文件**: `src/components/TabTodo.vue:15-21`

**问题描述**: 设计文档 §5.1.3.1 "并发控制"明确要求"前端按钮点击后立即禁用（防抖）"。当前实现中：
- `creating` 标志在 `try` 块中 `await createTodoItem(name)` 前设为 `true`
- 按钮通过 `:disabled="creating || !itemName.trim()"` 禁用

**分析**: 虽然 `creating` 在请求发出后被设为 `true` 从而禁用按钮，但在以下场景中存在时间窗口风险：
1. 用户快速双击时，第一次点击设置 `creating=true` 前的微任务间隙
2. Enter 键触发 (`@keyup.enter`) 和点击事件可能在同一事件循环中同时触发

**建议修复**: 在 `handleCreate` 函数开头增加 guard：
```javascript
async function handleCreate() {
  if (creating.value) return  // 显式防抖 guard
  const name = itemName.value.trim()
  // ...
}
```

**严重程度**: P1（Recommended）— 实际触发概率较低（Vue 响应式更新很快），但不符合设计规范要求。

---

## 6. Custom Extension Check (Step 5)

N/A（custom rules not enabled）— 无团队自定义规则配置。

---

## 7. Summary

| 类别 | 数量 | 详情 |
|------|------|------|
| **P0 (Blocker)** | **0** | 无功能不符、安全漏洞或严重可靠性问题 |
| **P1 (Recommended)** | **2** | #1 响应拦截器业务错误检测缺失；#2 创建按钮防抖不完整 |
| **P2 (Reference)** | **1** | API 函数缺少 JSDoc 注释 |

### 整体评价

代码质量良好。功能实现与设计文档高度一致，组件结构清晰，与现有架构风格保持一致。Vue 模板自动转义确保了 XSS 安全，超时配置合理，错误 UX 覆盖全面（loading/error/empty 三种状态均有处理）。两个 P1 建议项风险较低，建议在合并前修复。

### Blocker Count: 0

---

## 8. Fix Task List

- [ ] **P1 #1**: 在 `src/api/index.js` 响应拦截器中增加业务错误检测逻辑，将 HTTP 200 + 业务失败的响应转换为 reject
- [ ] **P1 #2**: 在 `src/components/TabTodo.vue` 的 `handleCreate` 函数开头增加 `if (creating.value) return` 防抖 guard
- [ ] **P2**: 为 `src/api/index.js` 中的 `createTodoItem` 和 `listTodoItems` 函数添加 JSDoc 注释
