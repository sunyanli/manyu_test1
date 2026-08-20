"""安全工具：密码哈希、恒定时间比较、Token 生成"""

import hmac
import secrets
from typing import Optional

import bcrypt

# bcrypt 计算成本，建议 >= 12
BCRYPT_COST = 12


def hash_password(password: str) -> str:
    """使用 bcrypt 对明文密码进行加盐哈希"""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=BCRYPT_COST)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """校验明文密码与 bcrypt 哈希是否匹配"""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        # 任何异常都不应暴露账号状态，统一返回 False
        return False


def constant_time_compare(a: str, b: str) -> bool:
    """恒定时间比较，防止时序攻击"""
    return hmac.compare_digest(a.encode("utf-8"), b.encode("utf-8"))


def generate_token(length: int = 32) -> str:
    """生成安全随机 Token"""
    return secrets.token_urlsafe(length)
