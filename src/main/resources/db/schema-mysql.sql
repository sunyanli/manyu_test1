-- 生产环境建表脚本（MySQL / Zdal 数据源），由 DBA 审核后执行
CREATE TABLE IF NOT EXISTS api_call_record (
    id             BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
    api_name       VARCHAR(64)  NOT NULL COMMENT '接口名（hello/hash/sort）',
    caller_id      VARCHAR(64)  DEFAULT NULL COMMENT '调用人工号',
    caller_name    VARCHAR(128) DEFAULT NULL COMMENT '调用人姓名',
    person_type    VARCHAR(64)  DEFAULT NULL COMMENT '人员类型',
    person_level   VARCHAR(64)  DEFAULT NULL COMMENT '人员层级',
    person_dept    VARCHAR(256) DEFAULT NULL COMMENT '人员部门',
    call_time      DATETIME     NOT NULL COMMENT '调用时间',
    result_status  VARCHAR(16)  DEFAULT NULL COMMENT '调用结果（success/failure）',
    result_summary VARCHAR(512) DEFAULT NULL COMMENT '页面展示结果摘要',
    gmt_create     DATETIME     DEFAULT NULL COMMENT '记录创建时间',
    PRIMARY KEY (id),
    KEY idx_api_name_call_time (api_name, call_time),
    KEY idx_call_time (call_time)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '接口调用埋点记录表';
