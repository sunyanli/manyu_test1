# manyu_test1 Review Profile

单文件 Web 应用（`index.html`），包含多 Tab 仪表盘 + To-Do 待办功能。

## 项目特定规则

- **唯一源码文件**: `index.html`，任何变更必须在此文件内闭环。
- **持久化**: 前端使用 `localStorage`，无后端数据库依赖。
- **To-Do MVP 边界**: 仅支持创建（名称+描述），不包含编辑、删除、完成标记。
- **XSS 防护**: 用户输入（名称、描述）在渲染时必须经过 HTML 转义。
- **无外部框架依赖**: 除 Chart.js (CDN) 外，无其他 JS 框架。
- **后端 API**: 依赖 `http://localhost:5000`，前端仅作消费方，不在此仓库维护。