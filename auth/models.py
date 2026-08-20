"""领域模型定义"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


class UserStatus(str, Enum):
    """用户账号状态"""

    ACTIVE = "active"
    DISABLED = "disabled"
    LOCKED = "locked"


@dataclass
class User:
    """用户实体"""

    id: str
    account: str
    password_hash: str
    status: UserStatus = UserStatus.ACTIVE
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Session:
    """服务端会话"""

    session_id: str
    user_id: str
    created_at: datetime
    expires_at: datetime
    remember_me: bool = False
    ip: Optional[str] = None
    user_agent: Optional[str] = None


@dataclass
class LoginLog:
    """登录审计日志"""

    id: str
    user_id: Optional[str]
    account: str
    ip: Optional[str]
    user_agent: Optional[str]
    success: bool
    reason: str
    timestamp: datetime
