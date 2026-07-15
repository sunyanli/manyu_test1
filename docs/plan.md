# 实施计划 — 组织架构与人员管理系统

> 生成日期：2026-07-15 | 阶段：plan | 技能：writing-plans | 基于：docs/clarification.md

---

## 一、目标与成功标准

### 目标
从零搭建一个企业级组织架构与人员管理全栈系统，支持部门树形结构管理、员工生命周期管理（新增/调动/离职）、RBAC 权限隔离，并处理循环引用、并发冲突、大数据量分页等高阶边界场景。

### 成功标准
1. 后端 8 个 API 端点全部可用，通过 Postman/curl 手动验证
2. 前端 4 个核心交互页面功能完整：部门树 + 人员列表 + 新增表单 + 调动/离职操作
3. 循环引用校验、乐观锁冲突、唯一性校验、分页等边界场景全部覆盖
4. RBAC 三种角色权限隔离生效（超管/HR 全权限，部门主管仅限本部门及子部门）

---

## 二、技术栈确认

| 层 | 技术 | 版本 |
|----|------|------|
| 后端框架 | NestJS | 10.x |
| 语言 | TypeScript | 5.x |
| ORM | TypeORM | 0.3.x |
| 数据库 | MySQL | 8.0 |
| 认证 | JWT + @nestjs/passport | - |
| 前端框架 | Vue 3 + Composition API | 3.x |
| UI 组件库 | Element Plus | 2.x |
| 状态管理 | Pinia | 2.x |
| HTTP 客户端 | Axios | - |

---

## 三、文件结构映射

```
org-hr-system/
├── server/                          # NestJS 后端
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── common/
│   │   │   ├── guards/
│   │   │   │   └── roles.guard.ts          # RBAC 角色守卫
│   │   │   ├── decorators/
│   │   │   │   └── roles.decorator.ts      # @Roles() 装饰器
│   │   │   ├── filters/
│   │   │   │   └── http-exception.filter.ts # 全局异常过滤器
│   │   │   └── interceptors/
│   │   │       └── transform.interceptor.ts # 统一响应包装 {code, data, msg}
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   └── dto/login.dto.ts
│   │   ├── department/
│   │   │   ├── department.module.ts
│   │   │   ├── department.controller.ts    # GET /tree, PUT /:id/move, DELETE /:id
│   │   │   ├── department.service.ts       # 树构建、循环引用检测、级联删除校验
│   │   │   ├── department.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-department.dto.ts
│   │   │       └── move-department.dto.ts
│   │   ├── employee/
│   │   │   ├── employee.module.ts
│   │   │   ├── employee.controller.ts      # GET /check, POST /, PUT /:id/resign
│   │   │   ├── employee.service.ts         # 唯一性校验、分页查询、乐观锁更新
│   │   │   ├── employee.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-employee.dto.ts
│   │   │       ├── check-employee.dto.ts
│   │   │       └── query-employee.dto.ts
│   │   └── transfer/
│   │       ├── transfer.module.ts
│   │       ├── transfer.controller.ts      # POST /employees/:id/transfer
│   │       ├── transfer.service.ts         # 调动事务、乐观锁、级联审批流更新
│   │       ├── transfer-log.entity.ts
│   │       └── dto/
│   │           └── transfer-employee.dto.ts
│   ├── ormconfig.ts                        # TypeORM 数据源配置
│   └── package.json
├── client/                          # Vue 3 前端
│   ├── src/
│   │   ├── main.ts
│   │   ├── App.vue
│   │   ├── router/
│   │   │   └── index.ts
│   │   ├── stores/
│   │   │   ├── department.ts              # 部门树 Pinia store（含懒加载缓存）
│   │   │   └── employee.ts                # 人员列表 Pinia store（含分页状态）
│   │   ├── api/
│   │   │   ├── department.ts              # 部门 API 封装
│   │   │   └── employee.ts                # 员工 API 封装
│   │   ├── views/
│   │   │   ├── Layout.vue                 # 左右分栏布局
│   │   │   ├── DepartmentTree.vue         # 部门树组件（懒加载 + 拖拽）
│   │   │   ├── EmployeeList.vue           # 人员分页列表
│   │   │   ├── EmployeeForm.vue           # 新增/编辑表单（实时校验）
│   │   │   └── EmployeeDetail.vue         # 详情页（调动/离职入口）
│   │   ├── components/
│   │   │   └── StatusTag.vue              # 在职/离职状态标签
│   │   └── utils/
│   │       └── request.ts                 # Axios 实例 + JWT 拦截器
│   ├── package.json
│   └── vite.config.ts
└── docs/
    ├── clarification.md
    └── plan.md                             # 本文件
```

---

## 四、实施阶段与任务分解

### Phase 1: 项目脚手架搭建

| # | 任务 | 产出物 | 依赖 | 优先级 |
|---|------|--------|------|--------|
| 1.1 | 初始化 NestJS 后端项目 | `server/` 目录，`nest new` 骨架 | - | 高 |
| 1.2 | 初始化 Vue 3 + Vite 前端项目 | `client/` 目录，`npm create vue@latest` 骨架 | - | 高 |
| 1.3 | 配置 TypeORM 连接 MySQL | `server/ormconfig.ts`，数据库连接可用 | 1.1 | 高 |
| 1.4 | 安装 Element Plus + Pinia + Axios | `client/package.json` 依赖就绪 | 1.2 | 高 |

### Phase 2: 基础设施层

| # | 任务 | 产出物 | 依赖 | 优先级 |
|---|------|--------|------|--------|
| 2.1 | 创建 departments / employees / transfer_logs 三个 Entity | `*.entity.ts`，含索引、唯一约束、version 乐观锁字段 | 1.3 | 高 |
| 2.2 | 编写数据库迁移 SQL（建表语句） | `server/migrations/` 或 `synchronize: true` 自动建表 | 2.1 | 高 |
| 2.3 | 实现 JWT 认证模块（auth） | 登录/注册 API，JWT Token 签发与验证 | 1.1 | 高 |
| 2.4 | 实现 RBAC 角色守卫 + 装饰器 | `roles.guard.ts`，`@Roles('admin','hr','manager')` | 2.3 | 高 |
| 2.5 | 实现全局异常过滤器 + 统一响应拦截器 | `{code, data, msg}` 标准响应格式 | 1.1 | 中 |
| 2.6 | 前端 Axios 封装 + JWT 拦截器 + 路由守卫 | `utils/request.ts`，`router/index.ts` 登录拦截 | 1.4, 2.3 | 中 |

### Phase 3: 部门管理模块

| # | 任务 | 产出物 | 依赖 | 优先级 |
|---|------|--------|------|--------|
| 3.1 | 实现 DepartmentService 树构建算法 | 递归查询 + path 字段加速子树查询 | 2.2 | 高 |
| 3.2 | 实现 `GET /api/departments/tree` 懒加载 API | 按 parent_id 查询子节点，返回带 children 的树 | 3.1 | 高 |
| 3.3 | 实现部门 CRUD（创建/编辑/删除） | 创建时更新 path，删除时校验子部门+员工 | 3.1 | 高 |
| 3.4 | 实现 `PUT /api/departments/:id/move` 循环引用检测 | 祖先检测：newParentId 不能是自身或子孙节点 | 3.1 | 高 |
| 3.5 | 前端 DepartmentTree 组件（懒加载 + 拖拽） | 左侧树形控件，Element Plus Tree + 拖拽库 | 3.2, 2.6 | 高 |
| 3.6 | 前端拖拽失败还原逻辑 | 后端返回 400 时，树还原到拖拽前状态 | 3.4, 3.5 | 中 |

### Phase 4: 员工管理模块

| # | 任务 | 产出物 | 依赖 | 优先级 |
|---|------|--------|------|--------|
| 4.1 | 实现 EmployeeService 唯一性校验 | `GET /api/employees/check`，按 employeeNo/phone 查重 | 2.2 | 高 |
| 4.2 | 实现 `POST /api/employees` 新增员工 | 事务：校验部门合法性 + 工号/手机号唯一 + 插入 | 4.1 | 高 |
| 4.3 | 实现员工分页列表查询 | 支持 `?page=1&size=20&deptId=2&status=active` 过滤 | 2.2 | 高 |
| 4.4 | 前端 EmployeeForm 组件（实时校验） | blur 事件触发唯一性校验，重复标红提示 | 4.1, 2.6 | 高 |
| 4.5 | 前端 EmployeeList 组件（分页表格） | 右侧分页表格，支持状态筛选，点击部门加载 | 4.3, 2.6 | 高 |
| 4.6 | 前端 StatusTag 组件 | 离职灰色标签，不可编辑状态渲染 | 4.5 | 低 |

### Phase 5: 调动与离职模块

| # | 任务 | 产出物 | 依赖 | 优先级 |
|---|------|--------|------|--------|
| 5.1 | 实现 `POST /api/employees/:id/transfer` 调动 API | 乐观锁 version 校验 + 更新 dept_id + 写入 transfer_logs | 4.2 | 高 |
| 5.2 | 实现级联审批流更新（stub） | 调动后触发审批流节点变更（可先 stub 占位，后续对接审批系统） | 5.1 | 中 |
| 5.3 | 实现 `PUT /api/employees/:id/resign` 离职 API | 逻辑删除：status='resigned' + resign_date + 清除登录权限 | 4.2 | 高 |
| 5.4 | 实现 409 Conflict 乐观锁冲突响应 | 并发调动时，version 不匹配返回 409 | 5.1 | 高 |
| 5.5 | 前端 EmployeeDetail 组件（调动/离职入口） | 详情页 + 调动弹窗 + 离职日期选择 + 确认警告 | 5.1, 5.3, 2.6 | 高 |
| 5.6 | 前端乐观锁冲突提示 | 409 响应时弹出"该员工信息已被他人修改，请刷新重试" | 5.4, 5.5 | 中 |

### Phase 6: 权限集成

| # | 任务 | 产出物 | 依赖 | 优先级 |
|---|------|--------|------|--------|
| 6.1 | 为部门/员工 Controller 添加 @Roles 装饰器 | 超管/HR 全权限，部门主管仅限本部门查看/编辑 | 2.4, 3.3, 4.2 | 高 |
| 6.2 | 部门主管数据范围过滤 | 员工查询仅返回本部门及子部门数据 | 6.1 | 高 |
| 6.3 | 前端按钮级权限控制 | 部门主管隐藏删除/调动按钮，仅显示编辑本部门人员 | 6.1, 2.6 | 中 |

### Phase 7: 边界场景验证

| # | 任务 | 产出物 | 依赖 | 优先级 |
|---|------|--------|------|--------|
| 7.1 | 循环引用场景测试 | 将"研发部"拖到"前端组"下，验证后端返回 400 | 3.4, 3.5 | 中 |
| 7.2 | 部门有人员时禁止删除测试 | 删除有员工的部门，验证后端拒绝 + 前端提示 | 3.3, 4.5 | 中 |
| 7.3 | 并发调动冲突测试 | 两个请求同时调动同一员工，验证 409 | 5.4 | 中 |
| 7.4 | 分页大数据量测试 | 插入 1000+ 条员工数据，验证分页性能 | 4.3 | 低 |
| 7.5 | 唯一性校验并发测试 | 同工号并发提交，验证唯一索引兜底 | 4.2 | 低 |

---

## 五、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 循环引用检测算法错误 | 树结构死循环，页面崩溃 | Phase 3.4 优先实现 ancestor-check 算法，Phase 7.1 专项测试 |
| 乐观锁 version 遗漏 | 并发覆盖导致数据不一致 | 所有 Employee 更新操作统一走 `findOne + version check + save` 模式 |
| 大数据量懒加载性能 | 前端卡顿 | 部门树仅加载当前层级，人员列表强制分页，后端索引覆盖 dept_id + status |
| 级联审批流更新 stub 不足 | 后续对接审批系统时接口不匹配 | 预留扩展点接口，审批流变更通过事件发布机制（EventEmitter）解耦 |
| 部门主管权限遗漏 | 越权查看/编辑 | Phase 6.2 数据范围过滤统一在 Service 层实现，不依赖 Controller 层 |

---

## 六、验证策略

### 后端验证
1. **单元测试**：DepartmentService 循环引用检测、EmployeeService 乐观锁更新
2. **API 集成测试**：使用 supertest 逐端点验证 8 个 API 的正向/异常流程
3. **手动验证**：Postman collection 覆盖全部 API 端点

### 前端验证
1. **组件交互**：部门树懒加载、拖拽、人员列表分页、表单实时校验
2. **边界场景**：拖拽还原、409 冲突提示、离职灰色标签、权限按钮显隐
3. **状态管理**：Pinia store 缓存正确性（切换部门不重复请求）

### 关键验证命令
```bash
# 后端测试
cd server && npm run test
cd server && npm run test:e2e

# 前端构建
cd client && npm run build
```

---

## 七、执行顺序总结

```
Phase 1 (脚手架) ──→ Phase 2 (基础设施) ──→ Phase 3 (部门) ──→ Phase 4 (员工)
                                                         ↘
                                              Phase 5 (调动/离职)
                                                         ↘
                                              Phase 6 (权限) ──→ Phase 7 (边界验证)
```

- Phase 1-2 为串行前置依赖，必须最先完成
- Phase 3 和 Phase 4 可部分并行（部门 Entity 就绪后即可启动员工模块）
- Phase 5 依赖 Phase 4 的 Employee Entity
- Phase 6 依赖 Phase 3-5 的 Controller 就绪
- Phase 7 为收尾验证，依赖所有功能模块完成