-- departments 表
CREATE TABLE IF NOT EXISTS departments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '部门名称',
    parent_id BIGINT DEFAULT NULL COMMENT '父部门ID',
    path VARCHAR(500) DEFAULT NULL COMMENT '物化路径，如1-2-5',
    sort_order INT DEFAULT 0 COMMENT '排序',
    manager_id BIGINT DEFAULT NULL COMMENT '部门主管ID',
    status VARCHAR(20) DEFAULT 'active' COMMENT '状态: active/inactive',
    version INT DEFAULT 0 COMMENT '乐观锁版本',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_parent_id (parent_id),
    INDEX idx_path (path)
) COMMENT '部门表';

-- employees 表
CREATE TABLE IF NOT EXISTS employees (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL COMMENT '姓名',
    employee_no VARCHAR(32) NOT NULL COMMENT '工号',
    phone VARCHAR(20) DEFAULT NULL COMMENT '手机号',
    email VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
    dept_id BIGINT DEFAULT NULL COMMENT '所属部门ID',
    position VARCHAR(100) DEFAULT NULL COMMENT '职位',
    hire_date DATE DEFAULT NULL COMMENT '入职日期',
    resign_date DATE DEFAULT NULL COMMENT '离职日期',
    status VARCHAR(20) DEFAULT 'active' COMMENT '状态: active/resigned',
    login_enabled TINYINT(1) DEFAULT 1 COMMENT '是否允许登录',
    version INT DEFAULT 0 COMMENT '乐观锁版本',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX uk_employee_no (employee_no),
    UNIQUE INDEX uk_phone (phone),
    INDEX idx_dept_id (dept_id),
    INDEX idx_status (status)
) COMMENT '员工表';

-- transfer_records 表
CREATE TABLE IF NOT EXISTS transfer_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT NOT NULL COMMENT '员工ID',
    from_dept_id BIGINT DEFAULT NULL COMMENT '原部门ID',
    to_dept_id BIGINT DEFAULT NULL COMMENT '目标部门ID',
    from_position VARCHAR(100) DEFAULT NULL COMMENT '原职位',
    to_position VARCHAR(100) DEFAULT NULL COMMENT '新职位',
    reason VARCHAR(500) DEFAULT NULL COMMENT '调动原因',
    operator_id BIGINT DEFAULT NULL COMMENT '操作人ID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_employee_id (employee_id)
) COMMENT '调动记录表';

-- audit_logs 表
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    operator_id BIGINT DEFAULT NULL COMMENT '操作人ID',
    action VARCHAR(50) NOT NULL COMMENT '操作类型',
    target_type VARCHAR(50) NOT NULL COMMENT '目标类型',
    target_id BIGINT DEFAULT NULL COMMENT '目标ID',
    detail TEXT COMMENT '操作详情JSON',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_target (target_type, target_id),
    INDEX idx_created_at (created_at)
) COMMENT '操作日志表';