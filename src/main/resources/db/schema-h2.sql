-- 演示环境建表脚本（H2 MySQL 兼容模式）
CREATE TABLE IF NOT EXISTS api_call_record (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    api_name       VARCHAR(64)  NOT NULL,
    caller_id      VARCHAR(64),
    caller_name    VARCHAR(128),
    person_type    VARCHAR(64),
    person_level   VARCHAR(64),
    person_dept    VARCHAR(256),
    call_time      DATETIME     NOT NULL,
    result_status  VARCHAR(16),
    result_summary VARCHAR(512),
    gmt_create     DATETIME
);

CREATE INDEX IF NOT EXISTS idx_api_call_time ON api_call_record (call_time);
