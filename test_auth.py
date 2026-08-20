"""
登录认证子系统集成测试
覆盖规格中的 8 条验收标准
"""

import pytest
from fastapi.testclient import TestClient

from auth.main import app, auth_service, users_repo
from auth.models import User, UserStatus
from auth.security import hash_password


@pytest.fixture
def client():
    """每个测试用例使用独立的 FastAPI TestClient"""
    from auth.main import _ip_attempts

    _ip_attempts.clear()
    return TestClient(app, base_url="https://test")


class TestAcceptanceCriteria:
    """按 Given/When/Then 组织验收测试"""

    # AC1: 正常登录
    def test_normal_login(self, client):
        response = client.post(
            "/api/auth/login",
            json={"account": "user@example.com", "password": "Secret123!"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["userId"] == "u-123"
        assert data["account"] == "user@example.com"
        assert data["message"] == "登录成功"
        assert "session_id" in response.cookies
        cookie = response.headers["set-cookie"]
        assert "HttpOnly" in cookie
        assert "Secure" in cookie
        assert "SameSite" in cookie

    # AC2: 错误密码
    def test_wrong_password(self, client):
        response = client.post(
            "/api/auth/login",
            json={"account": "user@example.com", "password": "WrongPass1!"},
        )
        assert response.status_code == 401
        assert response.json()["message"] == "账号或密码错误"

    # AC3: 不存在账号（响应时间与错误信息不可枚举）
    def test_nonexistent_account(self, client):
        response = client.post(
            "/api/auth/login",
            json={"account": "nobody@example.com", "password": "Secret123!"},
        )
        assert response.status_code == 401
        assert response.json()["message"] == "账号或密码错误"

    # AC4: 暴力破解防护（连续失败 5 次锁定）
    def test_brute_force_lock(self, client):
        account = "brute@example.com"
        user = User(
            id="u-brute",
            account=account,
            password_hash=hash_password("BruteForce1!"),
            status=UserStatus.ACTIVE,
        )
        users_repo.add(user)

        # 前 3 次失败不需要验证码；第 4/5 次需要验证码；第 6 次因锁定被阻
        for i in range(5):
            if i >= 3:
                response = client.post(
                    "/api/auth/login",
                    json={"account": account, "password": "WrongPass1!", "captcha": "1234"},
                )
            else:
                response = client.post(
                    "/api/auth/login",
                    json={"account": account, "password": "WrongPass1!"},
                )
            assert response.status_code == 401

        # 第 6 次触发锁定
        response = client.post(
            "/api/auth/login",
            json={"account": account, "password": "WrongPass1!", "captcha": "1234"},
        )
        assert response.status_code == 429
        assert response.json()["code"] == "ACCOUNT_LOCKED"

        # 即使使用正确密码也仍然锁定
        response = client.post(
            "/api/auth/login",
            json={"account": account, "password": "BruteForce1!"},
        )
        assert response.status_code == 429

    # AC5: 账号禁用
    def test_disabled_account(self, client):
        account = "disabled@example.com"
        user = User(
            id="u-disabled",
            account=account,
            password_hash=hash_password("Disabled1!"),
            status=UserStatus.DISABLED,
        )
        users_repo.add(user)

        response = client.post(
            "/api/auth/login",
            json={"account": account, "password": "Disabled1!"},
        )
        assert response.status_code == 403
        assert response.json()["message"] == "账号已被禁用"

    # AC6: 记住我
    def test_remember_me(self, client):
        response = client.post(
            "/api/auth/login",
            json={
                "account": "user@example.com",
                "password": "Secret123!",
                "rememberMe": True,
            },
        )
        assert response.status_code == 200
        cookie_header = response.headers["set-cookie"]
        # 长期 Cookie 过期时间应远大于短 Session
        assert "Max-Age=2592000" in cookie_header

    # AC7: 退出登录
    def test_logout(self, client):
        # 先登录
        response = client.post(
            "/api/auth/login",
            json={"account": "user@example.com", "password": "Secret123!"},
        )
        assert response.status_code == 200
        session_cookie = response.cookies["session_id"]

        # 访问受保护资源成功
        response = client.get("/api/auth/session")
        assert response.status_code == 200

        # 退出
        response = client.post("/api/auth/logout", cookies={"session_id": session_cookie})
        assert response.status_code == 204

        # 再次访问受保护资源失败
        response = client.get("/api/auth/session", cookies={"session_id": session_cookie})
        assert response.status_code == 401

    # AC8: 会话过期
    def test_session_expired(self, client):
        from datetime import datetime, timedelta

        from auth.models import Session

        # 构造一个已过期会话
        expired_session = Session(
            session_id="expired-session-id",
            user_id="u-123",
            created_at=datetime.utcnow() - timedelta(hours=2),
            expires_at=datetime.utcnow() - timedelta(hours=1),
        )
        auth_service.sessions.add(expired_session)

        response = client.get("/api/auth/session", cookies={"session_id": "expired-session-id"})
        assert response.status_code == 401
        assert response.json()["message"] == "会话已过期"


class TestSecurityFeatures:
    """安全相关附加测试"""

    def test_input_validation_missing_password(self, client):
        response = client.post(
            "/api/auth/login",
            json={"account": "user@example.com"},
        )
        assert response.status_code == 422

    def test_ip_rate_limit(self, client):
        from auth.main import _ip_attempts

        # 清空之前测试积累的 IP 计数，保证本测试可复现
        _ip_attempts.clear()

        # 利用不存在账号快速触发 IP 限流
        for _ in range(10):
            client.post(
                "/api/auth/login",
                json={"account": "rate@example.com", "password": "Secret123!"},
            )
        response = client.post(
            "/api/auth/login",
            json={"account": "rate@example.com", "password": "Secret123!"},
        )
        assert response.status_code == 429

    def test_captcha_required_after_three_failures(self, client):
        account = "captcha@example.com"
        user = User(
            id="u-captcha",
            account=account,
            password_hash=hash_password("Captcha1!"),
            status=UserStatus.ACTIVE,
        )
        users_repo.add(user)

        for _ in range(3):
            response = client.post(
                "/api/auth/login",
                json={"account": account, "password": "WrongPass1!"},
            )
            assert response.status_code == 401

        # 第四次需要验证码
        response = client.post(
            "/api/auth/login",
            json={"account": account, "password": "WrongPass2!"},
        )
        assert response.status_code == 429
        assert response.json()["code"] == "CAPTCHA_REQUIRED"
