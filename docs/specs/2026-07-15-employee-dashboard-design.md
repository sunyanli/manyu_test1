# 人员看板系统设计文档

> 创建日期: 2026-07-15  
> 任务标识: testDJ-0715  
> 状态: 需求澄清完成

## 一、需求概述

开发一个人员看板系统，支持员工信息的增删改查、批量导入、成本预算管理，以及白名单打标功能。

### 核心功能

| 功能模块 | 优先级 | 说明 |
|---------|--------|------|
| 员工信息管理 | P0 | 基本信息的增删改查 + 列表展示 |
| 批量导入 | P0 | Excel 文件上传 + 自动识别字段 + 错误反馈 |
| 成本预算管理 | P1 | 预算录入 + 统计汇总 |
| 白名单打标 | P1 | 员工白名单标识 + 筛选查询 |
| 看板视图 | P2 | 数据可视化统计 |

---

## 二、数据模型设计

### 2.1 员工表 (employee)

| 字段名 | 类型 | 说明 | 必填 |
|--------|------|------|------|
| id | BIGINT | 主键，自增 | ✓ |
| employee_no | VARCHAR(50) | 工号，唯一索引 | ✓ |
| name | VARCHAR(100) | 姓名 | ✓ |
| department | VARCHAR(100) | 部门 | ✓ |
| position | VARCHAR(100) | 岗位 | |
| phone | VARCHAR(20) | 手机号 | |
| email | VARCHAR(100) | 邮箱 | |
| hire_date | DATE | 入职日期 | |
| salary | DECIMAL(12,2) | 薪资 | |
| **whitelist_flag** | TINYINT(1) | **白名单标识（0=否，1=是）** | 默认0 |
| **budget_code** | VARCHAR(50) | **预算编码** | |
| created_at | DATETIME | 创建时间 | ✓ |
| updated_at | DATETIME | 更新时间 | ✓ |
| deleted | TINYINT(1) | 逻辑删除标识 | 默认0 |

**索引设计**：
- `uk_employee_no` UNIQUE INDEX on `employee_no`
- `idx_department` INDEX on `department`
- `idx_whitelist_flag` INDEX on `whitelist_flag`

### 2.2 预算记录表 (cost_budget)

| 字段名 | 类型 | 说明 | 必填 |
|--------|------|------|------|
| id | BIGINT | 主键，自增 | ✓ |
| employee_id | BIGINT | 关联员工ID | ✓ |
| budget_type | VARCHAR(50) | 预算类型（培训/设备/福利等） | ✓ |
| amount | DECIMAL(12,2) | 金额 | ✓ |
| budget_month | VARCHAR(7) | 生效月份（格式：YYYY-MM） | ✓ |
| description | VARCHAR(500) | 备注 | |
| created_at | DATETIME | 创建时间 | ✓ |

**索引设计**：
- `idx_employee_id` INDEX on `employee_id`
- `idx_budget_month` INDEX on `budget_month`

---

## 三、批量导入设计（核心功能）

### 3.1 导入流程

```
用户上传Excel文件
    ↓
后端接收并解析文件
    ↓
自动识别字段映射（按列名智能匹配）
    ↓
逐行数据校验（必填项、格式、唯一性）
    ↓
├─ 校验通过 → 批量插入数据库
└─ 校验失败 → 返回错误详情（行号 + 字段 + 错误原因）
```

### 3.2 自动识别规则

**Excel列名 → 数据库字段映射表**：

| Excel列名（可变体） | 数据库字段 | 识别规则 |
|-------------------|-----------|---------|
| 工号 / 员工编号 / employee_no | employee_no | 精确匹配或包含"工号" |
| 姓名 / name | name | 包含"姓名" |
| 部门 / department | department | 包含"部门" |
| 岗位 / position | position | 包含"岗位"或"职位" |
| 手机号 / phone | phone | 包含"手机"或"电话" |
| 邮箱 / email | email | 包含"邮箱"或"email" |
| 入职日期 / hire_date | hire_date | 包含"入职"或"日期" |
| 薪资 / salary | salary | 包含"薪资"或"工资" |
| 白名单 / whitelist | whitelist_flag | 包含"白名单"（值：是/否/1/0） |
| 预算编码 / budget_code | budget_code | 包含"预算"或"编码" |

### 3.3 错误返回格式

```json
{
  "success": false,
  "totalRows": 100,
  "successCount": 95,
  "failCount": 5,
  "errors": [
    {
      "row": 3,
      "field": "employee_no",
      "value": "EMP001",
      "message": "工号已存在"
    },
    {
      "row": 7,
      "field": "phone",
      "value": "1381234",
      "message": "手机号格式不正确"
    },
    {
      "row": 12,
      "field": "name",
      "value": "",
      "message": "姓名不能为空"
    }
  ]
}
```

### 3.4 导入接口设计

**请求**：
- 接口：`POST /api/employees/import`
- 参数：`multipart/form-data`，字段名 `file`
- 文件格式：`.xlsx` 或 `.csv`

**响应**：
```json
{
  "success": true,
  "totalRows": 100,
  "successCount": 100,
  "failCount": 0,
  "errors": []
}
```

---

## 四、白名单打标设计

### 4.1 功能说明

- **标识字段**：`whitelist_flag`（0=否，1=是）
- **设置方式**：
  1. 单个员工编辑时勾选
  2. 批量导入时识别"白名单"列
  3. 独立批量打标接口

### 4.2 批量打标接口

**请求**：
```http
PUT /api/employees/whitelist
Content-Type: application/json

{
  "employeeIds": [1, 2, 3],
  "whitelistFlag": 1
}
```

**响应**：
```json
{
  "success": true,
  "affectedRows": 3
}
```

### 4.3 查询筛选

**请求示例**：
```http
GET /api/employees?whitelistFlag=1&page=1&size=20
```

---

## 五、预算管理扩展设计

### 5.1 预算字段扩展

员工表新增预算相关字段：
- `budget_code`：预算编码（用于财务核算）
- 支持在员工详情页维护预算信息

### 5.2 预算记录管理

**新增预算记录接口**：
```http
POST /api/cost-budgets
Content-Type: application/json

{
  "employeeId": 1,
  "budgetType": "培训",
  "amount": 5000.00,
  "budgetMonth": "2026-07",
  "description": "Q3技术培训"
}
```

**查询员工预算汇总**：
```http
GET /api/cost-budgets/summary?employeeId=1
```

**响应**：
```json
{
  "employeeId": 1,
  "employeeName": "张三",
  "totalBudget": 15000.00,
  "budgets": [
    {
      "budgetType": "培训",
      "amount": 5000.00,
      "budgetMonth": "2026-07"
    },
    {
      "budgetType": "设备",
      "amount": 10000.00,
      "budgetMonth": "2026-06"
    }
  ]
}
```

---

## 六、API 接口清单

### 6.1 员工管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/employees | 新增员工 |
| PUT | /api/employees/{id} | 更新员工信息 |
| DELETE | /api/employees/{id} | 删除员工（逻辑删除） |
| GET | /api/employees/{id} | 查询单个员工详情 |
| GET | /api/employees | 分页查询员工列表 |
| POST | /api/employees/import | **批量导入员工** |
| PUT | /api/employees/whitelist | **批量白名单打标** |

### 6.2 预算管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/cost-budgets | 新增预算记录 |
| PUT | /api/cost-budgets/{id} | 更新预算记录 |
| DELETE | /api/cost-budgets/{id} | 删除预算记录 |
| GET | /api/cost-budgets | 查询预算记录列表 |
| GET | /api/cost-budgets/summary | 查询员工预算汇总 |

---

## 七、技术栈选型

### 后端
- **框架**：Spring Boot 2.7+
- **数据库**：MySQL 5.7+ / 8.0
- **ORM**：MyBatis-Plus（简化 CRUD）
- **Excel解析**：EasyExcel（阿里开源，性能优秀）
- **API文档**：Swagger/Knife4j

### 前端
- **框架**：Vue 3 + Vite
- **UI组件**：Element Plus
- **图表库**：ECharts（看板统计）
- **HTTP库**：Axios

---

## 八、实现计划

### 阶段一：基础框架（第1-2天）
- [ ] 初始化 Spring Boot 项目
- [ ] 配置数据库连接 + MyBatis-Plus
- [ ] 创建数据库表结构
- [ ] 基础 CRUD 接口开发

### 阶段二：批量导入（第3-4天）
- [ ] Excel 模板设计
- [ ] 字段自动识别逻辑
- [ ] 数据校验 + 错误返回
- [ ] 导入接口联调

### 阶段三：白名单与预算（第5天）
- [ ] 白名单打标接口
- [ ] 预算管理 CRUD
- [ ] 预算汇总统计

### 阶段四：前端看板（第6-7天）
- [ ] Vue 项目初始化
- [ ] 员工列表页 + 表单页
- [ ] 批量导入页面
- [ ] 看板统计图表

---

## 九、风险与决策记录

### 技术决策
1. **选择 EasyExcel 而非 POI**
   - 原因：内存占用更低，支持大文件导入（百万级数据）
   
2. **使用逻辑删除而非物理删除**
   - 原因：保留历史数据，支持数据恢复

3. **白名单采用 TINYINT 而非 BOOLEAN**
   - 原因：MySQL 无原生布尔类型，TINYINT 可扩展（未来可能支持多级标识）

### 已知风险
- 大文件导入可能导致内存溢出 → **对策**：限制单次导入行数（建议≤5000行）
- Excel 列名不规范可能影响自动识别 → **对策**：提供标准模板下载

---

## 十、待确认事项

✅ 已确认：
- 批量导入需支持自动识别字段
- 导入失败需返回详细错误信息
- 新增白名单打标功能
- 新增预算管理字段

🟡 待用户确认：
- [ ] 导入文件大小限制建议值（5000行？）
- [ ] 是否需要导入模板下载功能？
- [ ] 预算类型是否需要预设枚举值？

---

**下一步**：初始化 Spring Boot 项目骨架 + 数据库建表脚本