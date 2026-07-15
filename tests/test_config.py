import os
import pytest
from config import Config


def test_load_config_defaults():
    """环境变量全部缺失时，除 DB_PASSWORD 外使用默认值"""
    for key in list(os.environ.keys()):
        if key.startswith("DB_") or key.startswith("TASK_") or key in ("STATUS_COLUMN", "FAIL_REASON_COLUMN", "CREATED_AT_COLUMN"):
            os.environ.pop(key, None)
    cfg = Config()
    assert cfg.db_type == "mysql"
    assert cfg.db_host == "localhost"
    assert cfg.db_port == 3306
    assert cfg.db_name == "task_db"
    assert cfg.db_user == "root"
    assert cfg.db_password is None
    assert cfg.task_table == "task"
    assert cfg.status_column == "status"
    assert cfg.fail_reason_column == "fail_reason"
    assert cfg.created_at_column == "created_at"


def test_load_config_from_env():
    """环境变量存在时覆盖默认值"""
    os.environ["DB_HOST"] = "10.0.0.1"
    os.environ["DB_PORT"] = "3307"
    os.environ["DB_PASSWORD"] = "secret"
    cfg = Config()
    assert cfg.db_host == "10.0.0.1"
    assert cfg.db_port == 3307
    assert cfg.db_password == "secret"


def test_config_connection_string():
    cfg = Config(db_host="db.example.com", db_port=3306, db_user="app", db_password="pwd", db_name="mydb")
    assert cfg.connection_string() == {
        "host": "db.example.com",
        "port": 3306,
        "user": "app",
        "password": "pwd",
        "database": "mydb",
        "charset": "utf8mb4",
    }