-- =====================================================
-- 人员看板系统 - 数据库初始化脚本
-- 创建日期: 2026-07-15
-- 数据库: MySQL 5.7+ / 8.0
-- =====================================================

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS employee_dashboard 
DEFAULT CHARACTER SET utf8mb4 
DEFAULT COLLATE utf8mb4_unicode_ci;

USE employee_dashboard;

-- =====================================================
-- 1. 员工表
-- =====================================================
CREATE TABLE IF NOT EXISTS employee (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    employee_no VARCHAR(50) NOT NULL COMMENT '工号',
    name VARCHAR(100) NOT NULL COMMENT '姓名',
    department VARCHAR(100) NOT NULL COMMENT '部门',
    position VARCHAR(100) DEFAULT NULL COMMENT '岗位',
    phone VARCHAR(20) DEFAULT NULL COMMENT '手机号',
    email VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
    hire_date DATE DEFAULT NULL COMMENT '入职日期',
    salary DECIMAL(12,2) DEFAULT NULL COMMENT '薪资',
    whitelist_flag TINYINT(1) NOT NULL DEFAULT 0 COMMENT '白名单标识：0=否，1=是',
    budget_code VARCHAR(50) DEFAULT NULL COMMENT '预算编码',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除：0=未删除，1=已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_employee_no (employee_no),
    KEY idx_department (department),
    KEY idx_whitelist_flag (whitelist_flag),
    KEY idx_deleted (deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='员工信息表';

-- =====================================================
-- 2. 预算记录表
-- =====================================================
CREATE TABLE IF NOT EXISTS cost_budget (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    employee_id BIGINT NOT NULL COMMENT '关联员工ID',
    budget_type VARCHAR(50) NOT NULL COMMENT '预算类型（培训/设备/福利等）',
    amount DECIMAL(12,2) NOT NULL COMMENT '金额',
    budget_month VARCHAR(7) NOT NULL COMMENT '生效月份（格式：YYYY-MM）',
    description VARCHAR(500) DEFAULT NULL COMMENT '备注',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (id),
    KEY idx_employee_id (employee_id),
    KEY idx_budget_month (budget_month),
    KEY idx_budget_type (budget_type),
    CONSTRAINT fk_cost_budget_employee FOREIGN KEY (employee_id) 
        REFERENCES employee(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成本预算记录表';

-- =====================================================
-- 3. 导入错误记录表（用于批量导入错误追踪）
-- =====================================================
CREATE TABLE IF NOT EXISTS import_error_log (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    batch_no VARCHAR(50) NOT NULL COMMENT '导入批次号',
    file_name VARCHAR(200) NOT NULL COMMENT '导入文件名',
    row_number INT NOT NULL COMMENT 'Excel行号',
    field_name VARCHAR(50) NOT NULL COMMENT '错误字段名',
    field_value VARCHAR(500) DEFAULT NULL COMMENT '错误字段值',
    error_message VARCHAR(500) NOT NULL COMMENT '错误信息',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (id),
    KEY idx_batch_no (batch_no),
    KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='导入错误日志表';

-- =====================================================
-- 4. 预算类型枚举表（可选，便于扩展）
-- =====================================================
CREATE TABLE IF NOT EXISTS budget_type_dict (
    id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    type_code VARCHAR(50) NOT NULL COMMENT '类型编码',
    type_name VARCHAR(100) NOT NULL COMMENT '类型名称',
    sort_order INT DEFAULT 0 COMMENT '排序号',
    enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用：0=否，1=是',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_type_code (type_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='预算类型字典表';

-- =====================================================
-- 5. 初始化预算类型数据
-- =====================================================
INSERT INTO budget_type_dict (type_code, type_name, sort_order) VALUES
('TRAINING', '培训', 1),
('EQUIPMENT', '设备', 2),
('BENEFITS', '福利', 3),
('TRAVEL', '差旅', 4),
('MARKETING', '市场', 5),
('OTHER', '其他', 99);

-- =====================================================
-- 6. 示例数据（用于测试）
-- =====================================================
INSERT INTO employee (employee_no, name, department, position, phone, email, hire_date, salary, whitelist_flag, budget_code) VALUES
('EMP001', '张三', '技术部', '高级工程师', '13800138001', 'zhangsan@example.com', '2023-01-15', 25000.00, 1, 'BUDGET-TECH-001'),
('EMP002', '李四', '产品部', '产品经理', '13800138002', 'lisi@example.com', '2023-03-20', 20000.00, 0, 'BUDGET-PROD-001'),
('EMP003', '王五', '设计部', 'UI设计师', '13800138003', 'wangwu@example.com', '2023-06-01', 18000.00, 0, 'BUDGET-DES-001');

INSERT INTO cost_budget (employee_id, budget_type, amount, budget_month, description) VALUES
(1, 'TRAINING', 5000.00, '2026-07', 'Q3技术培训预算'),
(1, 'EQUIPMENT', 12000.00, '2026-06', '开发设备采购'),
(2, 'TRAINING', 3000.00, '2026-07', '产品经理认证培训');

-- =====================================================
-- 查询验证
-- =====================================================
SELECT '数据库初始化完成' AS message;
SELECT COUNT(*) AS employee_count FROM employee;
SELECT COUNT(*) AS budget_count FROM cost_budget;