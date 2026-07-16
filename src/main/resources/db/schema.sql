-- 组织架构与人员管理系统 DDL
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS orgmgmt DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE orgmgmt;

-- 部门表
CREATE TABLE IF NOT EXISTS department (
    id          BIGINT       AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL COMMENT '部门名称',
    parent_id   BIGINT       NOT NULL DEFAULT 0 COMMENT '父部门ID，0表示根部门',
    path        VARCHAR(500) NOT NULL DEFAULT '' COMMENT '物化路径，如 /1/2/3',
    sort_order  INT          NOT NULL DEFAULT 0 COMMENT '排序',
    manager_id  BIGINT       NULL     COMMENT '部门主管ID（员工ID）',
    status      VARCHAR(20)  NOT NULL DEFAULT 'active' COMMENT '状态: active/disbanded',
    deleted     TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除: 0正常/1删除',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_parent_id (parent_id),
    INDEX idx_path (path)
) ENGINE=InnoDB COMMENT='部门表';

-- 员工表
CREATE TABLE IF NOT EXISTS employee (
    id            BIGINT       AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(50)  NOT NULL COMMENT '姓名',
    employee_no   VARCHAR(50)  NOT NULL COMMENT '工号',
    phone         VARCHAR(20)  NULL     COMMENT '手机号',
    email         VARCHAR(100) NULL     COMMENT '邮箱',
    dept_id       BIGINT       NOT NULL COMMENT '所属部门ID',
    position      VARCHAR(100) NULL     COMMENT '职位',
    status        VARCHAR(20)  NOT NULL DEFAULT 'active' COMMENT '状态: active/resigned',
    hire_date     DATE         NULL     COMMENT '入职日期',
    resign_date   DATE         NULL     COMMENT '离职日期',
    login_enabled TINYINT      NOT NULL DEFAULT 1 COMMENT '登录权限: 0禁用/1启用',
    deleted       TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除: 0正常/1删除',
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE INDEX uk_employee_no (employee_no),
    UNIQUE INDEX uk_phone (phone),
    INDEX idx_dept_id (dept_id),
    INDEX idx_status (status)
) ENGINE=InnoDB COMMENT='员工表';

-- 调动记录表
CREATE TABLE IF NOT EXISTS transfer_record (
    id              BIGINT       AUTO_INCREMENT PRIMARY KEY,
    employee_id     BIGINT       NOT NULL COMMENT '员工ID',
    employee_name   VARCHAR(50)  NOT NULL COMMENT '员工姓名',
    from_dept_id    BIGINT       NULL     COMMENT '原部门ID',
    from_dept_name  VARCHAR(100) NULL     COMMENT '原部门名称',
    to_dept_id      BIGINT       NOT NULL COMMENT '新部门ID',
    to_dept_name    VARCHAR(100) NOT NULL COMMENT '新部门名称',
    from_position   VARCHAR(100) NULL     COMMENT '原职位',
    to_position     VARCHAR(100) NULL     COMMENT '新职位',
    reason          VARCHAR(500) NULL     COMMENT '调动原因',
    operator_id     BIGINT       NULL     COMMENT '操作人ID',
    operated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    INDEX idx_employee_id (employee_id)
) ENGINE=InnoDB COMMENT='调动记录表';

-- 操作日志表
CREATE TABLE IF NOT EXISTS audit_log (
    id            BIGINT       AUTO_INCREMENT PRIMARY KEY,
    operator_id   BIGINT       NULL     COMMENT '操作人ID',
    operator_name VARCHAR(50)  NULL     COMMENT '操作人姓名',
    action        VARCHAR(50)  NOT NULL COMMENT '操作: CREATE_EMPLOYEE/UPDATE_EMPLOYEE/DELETE_EMPLOYEE/TRANSFER/RESIGN/REINSTATE/CREATE_DEPT/UPDATE_DEPT/DELETE_DEPT/MOVE_DEPT',
    target_type   VARCHAR(50)  NOT NULL COMMENT '目标类型: department/employee',
    target_id     BIGINT       NOT NULL COMMENT '目标ID',
    detail        TEXT         NULL     COMMENT '操作详情',
    operated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    INDEX idx_target (target_type, target_id),
    INDEX idx_operated_at (operated_at)
) ENGINE=InnoDB COMMENT='操作日志表';