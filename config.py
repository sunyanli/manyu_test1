import os
from dataclasses import dataclass, field
from typing import Dict


@dataclass
class Config:
    db_type: str = field(default_factory=lambda: os.getenv("DB_TYPE", "mysql"))
    db_host: str = field(default_factory=lambda: os.getenv("DB_HOST", "localhost"))
    db_port: int = field(default_factory=lambda: int(os.getenv("DB_PORT", "3306")))
    db_name: str = field(default_factory=lambda: os.getenv("DB_NAME", "task_db"))
    db_user: str = field(default_factory=lambda: os.getenv("DB_USER", "root"))
    db_password: str | None = field(default_factory=lambda: os.getenv("DB_PASSWORD"))
    task_table: str = field(default_factory=lambda: os.getenv("TASK_TABLE", "task"))
    status_column: str = field(default_factory=lambda: os.getenv("STATUS_COLUMN", "status"))
    fail_reason_column: str = field(default_factory=lambda: os.getenv("FAIL_REASON_COLUMN", "fail_reason"))
    created_at_column: str = field(default_factory=lambda: os.getenv("CREATED_AT_COLUMN", "created_at"))
    output_dir: str = field(default_factory=lambda: os.getenv("OUTPUT_DIR", "reports"))
    retention_days: int = field(default_factory=lambda: int(os.getenv("RETENTION_DAYS", "90")))

    def connection_string(self) -> Dict[str, object]:
        kwargs: Dict[str, object] = {
            "host": self.db_host,
            "port": self.db_port,
            "user": self.db_user,
            "database": self.db_name,
            "charset": "utf8mb4",
        }
        if self.db_password:
            kwargs["password"] = self.db_password
        return kwargs