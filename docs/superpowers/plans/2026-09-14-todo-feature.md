# 待办事项 (Todo) 功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 Algorithm Dashboard 中新增「待办事项」Tab，允许内部用户创建包含名称和描述的待办事项，数据持久化到 localStorage。

**Architecture:** 新增 `TodoTab` 组件复用现有 Tab 架构，通过 React useState 管理表单状态，localStorage 持久化 Todo 列表。每个 Todo 项包含 id（UUID）、name（必填）、description（选填）、createdAt（ISO 时间戳）。组件内联样式与现有风格一致。

**Tech Stack:** React 18, react-scripts 5.0.1 (Create React App), Jest (内置), localStorage API

## Global Constraints

- 仅创建功能，不包含编辑、删除、完成标记
- 目标用户为内部用户，无需权限控制
- 数据存储在浏览器 localStorage，key 为 `algorithm_dashboard_todos`
- 遵循现有代码风格：函数式组件、内联样式常量、无 TypeScript

---

## File Structure

```
src/
├── TodoTab.js          # 新建 — Todo 组件：表单输入 + 已创建列表展示
├── TodoTab.test.js     # 新建 — Jest + React Testing Library 测试
├── AlgorithmDashboard.js  # 修改 — 注册 TodoTab 为第四个 Tab
```

- `TodoTab.js` 负责全部 Todo 交互（表单输入、创建、列表渲染），不拆分子组件（YAGNI）
- `TodoTab.test.js` 覆盖渲染、表单输入、创建流程、localStorage 读写
- `AlgorithmDashboard.js` 仅追加 tabs 数组项和条件渲染出口

---

### Task 1: 编写 TodoTab 组件测试

**Files:**
- Create: `src/TodoTab.test.js`

**Interfaces:**
- Consumes: `TodoTab` 默认导出组件（尚未创建）
- Produces: 无外部接口，测试描述 TodoTab 的行为契约

- [ ] **Step 1: 创建测试文件，编写渲染测试**

```javascript
// src/TodoTab.test.js
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import TodoTab from './TodoTab';

beforeEach(() => {
  localStorage.clear();
});

describe('TodoTab', () => {
  test('renders name input, description textarea, and create button', () => {
    render(<TodoTab />);
    expect(screen.getByPlaceholderText('事项名称')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('事项描述（可选）')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新增待办' })).toBeInTheDocument();
  });

  test('disables create button when name is empty', () => {
    render(<TodoTab />);
    const button = screen.getByRole('button', { name: '新增待办' });
    expect(button).toBeDisabled();
  });

  test('enables create button when name is non-empty', () => {
    render(<TodoTab />);
    const nameInput = screen.getByPlaceholderText('事项名称');
    const button = screen.getByRole('button', { name: '新增待办' });
    fireEvent.change(nameInput, { target: { value: '测试任务' } });
    expect(button).not.toBeDisabled();
  });

  test('creates a todo and displays it in the list', () => {
    render(<TodoTab />);
    const nameInput = screen.getByPlaceholderText('事项名称');
    const descInput = screen.getByPlaceholderText('事项描述（可选）');
    const button = screen.getByRole('button', { name: '新增待办' });

    fireEvent.change(nameInput, { target: { value: '学习 React' } });
    fireEvent.change(descInput, { target: { value: '完成 Hooks 章节' } });
    fireEvent.click(button);

    expect(screen.getByText('学习 React')).toBeInTheDocument();
    expect(screen.getByText('完成 Hooks 章节')).toBeInTheDocument();
  });

  test('clears inputs after successful creation', () => {
    render(<TodoTab />);
    const nameInput = screen.getByPlaceholderText('事项名称');
    const descInput = screen.getByPlaceholderText('事项描述（可选）');
    const button = screen.getByRole('button', { name: '新增待办' });

    fireEvent.change(nameInput, { target: { value: '学习 React' } });
    fireEvent.change(descInput, { target: { value: 'Hooks' } });
    fireEvent.click(button);

    expect(nameInput.value).toBe('');
    expect(descInput.value).toBe('');
  });

  test('persists todos to localStorage', () => {
    render(<TodoTab />);
    const nameInput = screen.getByPlaceholderText('事项名称');
    const button = screen.getByRole('button', { name: '新增待办' });

    fireEvent.change(nameInput, { target: { value: '持久化测试' } });
    fireEvent.click(button);

    const stored = JSON.parse(localStorage.getItem('algorithm_dashboard_todos'));
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('持久化测试');
    expect(stored[0].id).toBeDefined();
    expect(stored[0].createdAt).toBeDefined();
  });

  test('loads existing todos from localStorage on mount', () => {
    const existingTodo = {
      id: 'abc-123',
      name: '已存在的任务',
      description: '已有描述',
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('algorithm_dashboard_todos', JSON.stringify([existingTodo]));

    render(<TodoTab />);
    expect(screen.getByText('已存在的任务')).toBeInTheDocument();
    expect(screen.getByText('已有描述')).toBeInTheDocument();
  });

  test('displays multiple todos in creation order', () => {
    render(<TodoTab />);
    const nameInput = screen.getByPlaceholderText('事项名称');
    const button = screen.getByRole('button', { name: '新增待办' });

    fireEvent.change(nameInput, { target: { value: '任务一' } });
    fireEvent.click(button);
    fireEvent.change(nameInput, { target: { value: '任务二' } });
    fireEvent.click(button);

    const items = screen.getAllByText(/任务/);
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toBe('任务一');
    expect(items[1].textContent).toBe('任务二');
  });

  test('shows empty state when no todos exist', () => {
    render(<TodoTab />);
    expect(screen.getByText('暂无待办事项')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认全部失败（组件不存在）**

Run: `npx react-scripts test --watchAll=false --verbose 2>&1 | head -40`

Expected: 8 failed — "TodoTab is not defined" 或类似模块未找到错误。

- [ ] **Step 3: 提交测试文件**

```bash
git add src/TodoTab.test.js
git commit -m "test: add TodoTab component tests"
```

---

### Task 2: 实现 TodoTab 组件

**Files:**
- Create: `src/TodoTab.js`

**Interfaces:**
- Consumes: React (useState, useEffect), localStorage API
- Produces: 默认导出 `function TodoTab()`，返回 JSX

- [ ] **Step 1: 创建最小实现通过渲染测试**

```javascript
// src/TodoTab.js
import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'algorithm_dashboard_todos';

/** 生成简单唯一 ID */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export default function TodoTab() {
  const [todos, setTodos] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // 初始化：从 localStorage 加载已有数据
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setTodos(JSON.parse(stored));
      }
    } catch {
      // 数据损坏时忽略
    }
  }, []);

  // 每次 todos 变化时持久化
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  const handleCreate = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const newTodo = {
      id: generateId(),
      name: trimmedName,
      description: description.trim(),
      createdAt: new Date().toISOString(),
    };

    setTodos((prev) => [...prev, newTodo]);
    setName('');
    setDescription('');
  };

  const canCreate = name.trim().length > 0;

  return (
    <div style={{ padding: 20 }}>
      {/* 创建表单 */}
      <div style={{ marginBottom: 24 }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="事项名称"
          style={inputStyle}
          onKeyDown={(e) => { if (e.key === 'Enter' && canCreate) handleCreate(); }}
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="事项描述（可选）"
          style={{ ...inputStyle, width: 360 }}
          onKeyDown={(e) => { if (e.key === 'Enter' && canCreate) handleCreate(); }}
        />
        <button onClick={handleCreate} disabled={!canCreate} style={{
          ...btnStyle,
          opacity: canCreate ? 1 : 0.5,
          cursor: canCreate ? 'pointer' : 'not-allowed',
        }}>
          新增待办
        </button>
      </div>

      {/* Todo 列表 */}
      {todos.length === 0 ? (
        <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>
          暂无待办事项
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {todos.map((todo) => (
            <li key={todo.id} style={todoItemStyle}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{todo.name}</div>
              {todo.description && (
                <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>{todo.description}</div>
              )}
              <div style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>
                {new Date(todo.createdAt).toLocaleString('zh-CN')}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// 与 AlgorithmDashboard 保持一致的样式常量
const btnStyle = {
  padding: '8px 16px',
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  background: '#1890ff',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 14,
  marginLeft: 8,
};

const inputStyle = {
  padding: '8px 12px',
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  fontSize: 14,
  width: 200,
  marginRight: 8,
};

const todoItemStyle = {
  padding: '12px 16px',
  borderBottom: '1px solid #f0f0f0',
  background: '#fafafa',
  borderRadius: 4,
  marginBottom: 8,
};
```

- [ ] **Step 2: 运行测试，确认全部通过**

Run: `npx react-scripts test --watchAll=false --verbose 2>&1 | tail -20`

Expected: 8 passed, 0 failed.

- [ ] **Step 3: 提交组件代码**

```bash
git add src/TodoTab.js
git commit -m "feat: add TodoTab component with localStorage persistence"
```

---

### Task 3: 集成 TodoTab 到 AlgorithmDashboard

**Files:**
- Modify: `src/AlgorithmDashboard.js`

**Interfaces:**
- Consumes: `TodoTab` 默认导出组件
- Produces: 无新增接口，现有 Dashboard Tab 切换逻辑扩展

- [ ] **Step 1: 修改 AlgorithmDashboard.js，新增 Todo Tab**

在文件顶部 import 区域追加：

```javascript
import TodoTab from './TodoTab';
```

将 tabs 数组（约第 292-296 行）扩展为：

```javascript
const tabs = [
  { key: 'helloworld',  label: 'Hello World' },
  { key: 'hash',        label: '哈希算法' },
  { key: 'bubbleSort',  label: '冒泡排序' },
  { key: 'todo',        label: '待办事项' },
];
```

在条件渲染区域（约第 325-327 行）追加：

```javascript
{activeTab === 'todo' && <TodoTab />}
```

完整修改后的 diff：

```diff
--- a/src/AlgorithmDashboard.js
+++ b/src/AlgorithmDashboard.js
@@ -1,6 +1,7 @@
 import React, { useState, useEffect, useCallback } from 'react';
 import ReactECharts from 'echarts-for-react';
+import TodoTab from './TodoTab';
 
 const API_BASE = 'http://localhost:8080';
 
@@ -290,9 +291,10 @@ export default function AlgorithmDashboard() {
   const tabs = [
     { key: 'helloworld',  label: 'Hello World' },
     { key: 'hash',        label: '哈希算法' },
     { key: 'bubbleSort',  label: '冒泡排序' },
+    { key: 'todo',        label: '待办事项' },
   ];
 
   return (
     <div style={{ maxWidth: 960, margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
@@ -323,6 +325,7 @@ export default function AlgorithmDashboard() {
       {activeTab === 'helloworld' && <HelloWorldTab />}
       {activeTab === 'hash' && <HashTab />}
       {activeTab === 'bubbleSort' && <BubbleSortTab />}
+      {activeTab === 'todo' && <TodoTab />}
 
       {/* 报表区域 */}
       <ReportPanel />
```

- [ ] **Step 2: 运行 TodoTab 测试确认集成无回归**

Run: `npx react-scripts test --watchAll=false --verbose 2>&1 | tail -20`

Expected: TodoTab 8 tests pass（AlgorithmDashboard 无测试，故总数仍为 8 passed）。

- [ ] **Step 3: 验证构建不报错**

Run: `npx react-scripts build 2>&1 | tail -15`

Expected: "The build folder is ready to be deployed." 无 error。

- [ ] **Step 4: 提交集成变更**

```bash
git add src/AlgorithmDashboard.js
git commit -m "feat: integrate TodoTab into AlgorithmDashboard"
```

---

## Self-Review Checklist

### 1. Spec Coverage
| 需求项 | 对应 Task | 状态 |
|--------|-----------|------|
| 新增待办事项 | Task 2 — `handleCreate` | ✅ |
| 事项名称输入 | Task 2 — name input, trimmed validation | ✅ |
| 事项描述输入 | Task 2 — description input (optional) | ✅ |
| 内部用户 | Task 2 — localStorage，无需鉴权 | ✅ |
| 最小闭环（仅创建） | 全部 Task — 无编辑/删除/完成功能 | ✅ |

无遗漏。

### 2. Placeholder Scan
已逐行扫描，无 TBD、TODO、"implement later"、"add validation"、"handle edge cases" 等占位符。所有代码片段均为完整可运行代码。

### 3. Type Consistency
- `TodoTab` 默认导出：Task 1 测试和 Task 3 集成均使用 `import TodoTab from './TodoTab'` ✅
- `generateId()` 函数仅在 Task 2 组件内部定义和使用 ✅
- `STORAGE_KEY = 'algorithm_dashboard_todos'`：Task 1 测试和 Task 2 实现一致 ✅
- 数据模型字段 `id`, `name`, `description`, `createdAt`：测试断言与实现字段完全匹配 ✅

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-14-todo-feature.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?