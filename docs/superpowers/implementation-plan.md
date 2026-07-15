# 组织架构与人员管理系统 — 实施计划

> **版本**: v1.0
> **日期**: 2026-07-15
> **阶段**: plan / 实施计划
> **方法**: writing-plans 技能驱动
> **前置文档**: [需求澄清文档](./clarification.md)

---

## 一、项目总览

### 1.1 目标

开发一套组织架构管理模块，支持部门树形结构搭建、员工生命周期管理（入职、调动、离职、复职），为审批、权限等业务系统提供准确的人员数据源。

### 1.2 技术栈

| 层 | 技术选型 | 说明 |
|---|---|---|
| 后端框架 | Spring Boot 3.x + MyBatis-Plus | 主流生态 |
| 数据库 | MySQL 8.0 | 递归 CTE + 物化路径 |
| 缓存 | Redis（v1 可选） | 部门树缓存 |
| 前端 | Vue 3 + Element Plus + Pinia | 树组件、拖拽、表单校验 |
| 拖拽 | vuedraggable（SortableJS） | 与 Vue 3 深度集成 |
| API 风格 | RESTful | 统一 JSON 响应格式 |

### 1.3 核心角色与权限

| 角色 | 标识 | 权限范围 |
|---|---|---|
| 超管 | admin | 系统配置 + 所有人员/部门管理 |
| HR | hr | 所有人员/部门管理（v1 与超管等同） |
| 部门主管 | dept_manager | 仅查看本部门及子部门人员，可编辑部分信息 |

---

## 二、实施任务分解

### 阶段 1：后端基础设施搭建（预计 2d）

#### 任务 1.1：项目初始化与数据库建表

- **内容**：Spring Boot 3.x 项目脚手架、MyBatis-Plus 配置、数据库 DDL 脚本
- **产出**：
  - `src/main/resources/db/migration/V1__init.sql` — 4 张核心表 DDL
  - `application.yml` 数据源与 MyBatis-Plus 配置
- **表结构**：
  - `departments` — id, name, parent_id, path, sort_order, manager_id, status, created_at, updated_at
  - `employees` — id, name, employee_no, phone, email, dept_id, position, hire_date, status, login_enabled, created_at, updated_at
  - `transfer_records` — id, employee_id, from_dept_id, to_dept_id, from_position, to_position, reason, operator_id, created_at
  - `audit_logs` — id, operator_id, action, target_type, target_id, detail, created_at
- **索引**：`employees.dept_id`、`employees.employee_no`（唯一）、`employees.phone`（唯一）、`departments.parent_id`、`departments.path`
- **验证**：DDL 脚本在 MySQL 8.0 执行成功，`SHOW TABLES` 确认

#### 任务 1.2：通用响应体与异常处理

- **内容**：统一 `ApiResponse<T>` 封装、全局异常处理器 `GlobalExceptionHandler`
- **产出**：
  - `common/ApiResponse.java` — `{ code, msg, data }`
  - `common/BusinessException.java` — 业务异常
  - `config/GlobalExceptionHandler.java` — 统一异常拦截
- **验证**：单元测试覆盖 400/404/500 场景

---

### 阶段 2：部门管理模块（预计 2.5d）

#### 任务 2.1：部门实体与 CRUD

- **内容**：Department 实体、Mapper、Service、Controller
- **接口**：
  - `POST /api/departments` — 新增部门
  - `PUT /api/departments/{id}` — 编辑部门
  - `DELETE /api/departments/{id}` — 逻辑删除（校验无人员/子部门）
- **关键逻辑**：新增时自动计算 `path`（`parent.path + "-" + id`），`sort_order` 默认末尾
- **验证**：集成测试覆盖新增/编辑/删除正常与异常场景

#### 任务 2.2：部门树查询

- **内容**：树形结构组装与懒加载
- **接口**：
  - `GET /api/departments/tree` — 获取完整部门树
  - `GET /api/departments/{id}/children` — 懒加载子节点
- **关键逻辑**：使用 `path` 字段加速子孙查询，Java 层递归组装树结构
- **验证**：集成测试验证多层嵌套树结构组装正确性

#### 任务 2.3：部门拖拽移动

- **内容**：拖拽变更父节点事务处理
- **接口**：`PUT /api/departments/{id}/move` — `{ "newParentId": 5 }`
- **关键逻辑**：
  - 校验目标部门非自身子孙（防循环引用）
  - 更新 `parent_id`，级联更新所有子孙 `path`
  - 事务包裹
- **验证**：集成测试覆盖正常移动、循环引用拒绝、跨层级移动及 path 级联更新

---

### 阶段 3：员工管理模块（预计 3d）

#### 任务 3.1：员工实体与 CRUD

- **内容**：Employee 实体、Mapper、Service、Controller
- **接口**：
  - `GET /api/employees` — 分页列表（支持 deptId、status、keyword 筛选）
  - `GET /api/employees/{id}` — 详情
  - `POST /api/employees` — 新增
  - `PUT /api/employees/{id}` — 编辑
- **关键逻辑**：
  - 新增时校验 `employee_no` 和 `phone` 全局唯一
  - 校验 `dept_id` 合法性
  - 分页查询支持部门主管数据范围过滤（仅本部门及子部门）
- **验证**：集成测试覆盖新增、编辑、分页筛选、权限过滤

#### 任务 3.2：唯一性实时校验

- **内容**：前端防抖 + 后端校验接口
- **接口**：`GET /api/employees/check?field=employeeNo&value=10086`
- **响应**：`{ "code": 200, "data": { "isExist": false } }`
- **关键逻辑**：前端 300ms 防抖，后端走唯一索引快速查询
- **验证**：集成测试覆盖重复/非重复场景

#### 任务 3.3：人员调动

- **内容**：调动事务 + 级联更新 + 留痕
- **接口**：`POST /api/employees/{id}/transfer` — `{ "newDeptId": 3, "newPosition": "Java开发", "reason": "业务调整" }`
- **关键逻辑**：
  - 更新 `employees.dept_id` 和 `position`
  - 级联触发审批流节点变更（预留扩展点，v1 记录 audit_log）
  - 写入 `transfer_records` 调动历史
  - 事务包裹
- **验证**：集成测试覆盖正常调动、调动记录写入、审批流变更日志

#### 任务 3.4：员工离职与复职

- **内容**：逻辑删除、资源释放、复职
- **接口**：
  - `PUT /api/employees/{id}/resign` — `{ "resignDate": "2023-11-01" }`
  - `PUT /api/employees/{id}/reinstate` — 复职
- **关键逻辑**：
  - 离职：`status = 'resigned'`，`login_enabled = false`，记录 `resign_date`
  - 允许补录离职日期（不超过当前日期 30 天前）
  - 复职：`status = 'active'`，重新分配 `dept_id`
  - 写入 `audit_log` 操作日志
- **验证**：集成测试覆盖离职、复职、补录日期校验、状态过滤

#### 任务 3.5：调动历史查询

- **接口**：`GET /api/employees/{id}/transfer-history`
- **验证**：集成测试覆盖有/无调动记录场景

---

### 阶段 4：前端页面开发（预计 3.5d）

#### 任务 4.1：项目初始化与路由

- **内容**：Vue 3 + Element Plus 脚手架、Pinia 状态管理、路由配置
- **产出**：项目骨架，路由表（部门管理、人员管理、人员详情）
- **验证**：`npm run dev` 启动正常，路由跳转正确

#### 任务 4.2：部门树组件

- **内容**：左侧部门树组件
- **功能点**：
  - 默认展开第一级
  - 懒加载子节点（`/api/departments/{id}/children`）
  - 拖拽调整层级（vuedraggable）
  - 点击节点加载人员列表
- **状态管理**：Pinia store `useDeptStore` 缓存部门树
- **验证**：手动验证树展开、懒加载、拖拽

#### 任务 4.3：人员列表与筛选

- **内容**：右侧人员列表 + 筛选栏
- **功能点**：
  - 分页表格展示
  - 筛选：部门、状态（在职/离职）、关键词搜索
  - 离职人员灰色标签，不可编辑
- **验证**：手动验证分页、筛选、状态标签

#### 任务 4.4：员工表单与校验

- **内容**：新增/编辑员工表单
- **功能点**：
  - 实时唯一性校验（工号/手机号，300ms 防抖 + 输入框标红）
  - 部门选择器（级联或树选择）
  - 表单验证规则
- **验证**：手动验证表单提交、实时校验、重复标红

#### 任务 4.5：调动与离职操作

- **内容**：调动弹窗、离职办理、复职按钮
- **功能点**：
  - 调动：选择目标部门 + 新职位，弹出确认警告
  - 离职：选择离职日期，日期选择器
  - 复职：按钮可见性控制（仅离职人员显示）
- **验证**：手动验证调动、离职、复职完整流程

---

### 阶段 5：权限与安全（预计 1.5d）

#### 任务 5.1：RBAC 权限控制

- **内容**：接口级权限拦截 + 数据级行权限
- **关键逻辑**：
  - 注解 `@PreAuthorize` 控制接口访问角色
  - 部门主管查询人员时自动过滤 `dept_id IN (本部门及子部门)`
  - 使用 `path` 字段实现子部门范围查询
- **产出**：
  - `config/SecurityConfig.java` — Spring Security 配置
  - `annotation/RequireRole.java` — 自定义权限注解
  - `aspect/DataScopeAspect.java` — 数据范围切面
- **验证**：集成测试覆盖三种角色权限、跨部门越权访问拒绝

#### 任务 5.2：操作日志记录

- **内容**：AOP 切面自动记录关键操作
- **产出**：`aspect/AuditLogAspect.java`
- **记录范围**：新增员工、编辑员工、调动、离职、复职、部门移动
- **验证**：集成测试验证每次操作后 `audit_logs` 表有对应记录

---

### 阶段 6：测试与联调（预计 1.5d）

#### 任务 6.1：集成测试补全

- **内容**：覆盖所有 API 端点的正常与异常场景
- **重点场景**：
  - 并发唯一性校验（工号/手机号重复）
  - 部门循环引用防护
  - 离职员工不可编辑
  - 部门主管越权访问
- **验证**：`mvn test` 全部通过

#### 任务 6.2：前后端联调

- **内容**：前端接入真实后端 API，端到端流程验证
- **验证场景**：完整 CRUD + 调动 + 离职 + 复职

---

## 三、实施顺序与依赖关系

```
阶段 1（基础设施）
  └─→ 阶段 2（部门管理）
        └─→ 阶段 3（员工管理）
              ├─→ 阶段 4（前端页面）
              └─→ 阶段 5（权限安全）
                    └─→ 阶段 6（测试联调）
```

- 阶段 2 依赖阶段 1 的数据库与项目骨架
- 阶段 3 依赖阶段 2 的部门树查询（员工新增需选部门）
- 阶段 4 依赖阶段 2+3 的 API 全部就绪
- 阶段 5 可与阶段 4 并行开发
- 阶段 6 依赖所有前置阶段完成

---

## 四、风险与缓解

| 风险 | 等级 | 缓解措施 |
|---|---|---|
| 拖拽移动时 path 级联更新性能 | 中 | path 字段批量 UPDATE 使用 `REPLACE(path, old_prefix, new_prefix)`，加事务 |
| 部门主管数据范围过滤复杂度 | 中 | 利用 `path LIKE 'dept_path-%' OR id = dept_id` 实现子部门查询，不走递归 CTE |
| 前端懒加载 + 拖拽交互复杂度 | 中 | vuedraggable 已封装拖拽，移动后重新请求树刷新 |
| 并发唯一性校验失败 | 低 | 数据库唯一索引保底，应用层校验失败返回友好提示 |

---

## 五、API 接口清单（共 15 个）

| # | 接口 | 方法 | 说明 | 所属阶段 |
|---|---|---|---|---|
| 1 | `/api/departments/tree` | GET | 完整部门树 | 阶段 2 |
| 2 | `/api/departments/{id}/children` | GET | 懒加载子部门 | 阶段 2 |
| 3 | `/api/departments` | POST | 新增部门 | 阶段 2 |
| 4 | `/api/departments/{id}` | PUT | 编辑部门 | 阶段 2 |
| 5 | `/api/departments/{id}` | DELETE | 逻辑删除部门 | 阶段 2 |
| 6 | `/api/departments/{id}/move` | PUT | 拖拽移动部门 | 阶段 2 |
| 7 | `/api/employees` | GET | 人员列表（分页+筛选） | 阶段 3 |
| 8 | `/api/employees/{id}` | GET | 人员详情 | 阶段 3 |
| 9 | `/api/employees` | POST | 新增员工 | 阶段 3 |
| 10 | `/api/employees/{id}` | PUT | 编辑员工 | 阶段 3 |
| 11 | `/api/employees/check` | GET | 唯一性校验 | 阶段 3 |
| 12 | `/api/employees/{id}/transfer` | POST | 人员调动 | 阶段 3 |
| 13 | `/api/employees/{id}/resign` | PUT | 办理离职 | 阶段 3 |
| 14 | `/api/employees/{id}/reinstate` | PUT | 复职 | 阶段 3 |
| 15 | `/api/employees/{id}/transfer-history` | GET | 调动历史 | 阶段 3 |

---

## 六、下一步

1. 评审本实施计划，确认任务分解与排期
2. 进入开发阶段，按阶段 1 → 2 → 3 → 4/5 → 6 顺序执行
3. 每个阶段完成后执行对应的验证项