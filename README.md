# manyu_test1

## 登录认证子系统

本仓库在 QuickSort 示例基础上新增了一个基于 FastAPI 的安全登录认证子系统。

### 主要文件

- `auth/` — 认证模块源码
  - `models.py` — User / Session / LoginLog 领域模型
  - `security.py` — bcrypt 密码哈希、恒定时间比较、Token 生成
  - `repository.py` — 内存仓库（可替换为数据库 / Redis）
  - `services.py` — 登录、锁定、会话、审计日志等业务逻辑
  - `main.py` — FastAPI 接口层
- `test_auth.py` — 覆盖 8 条验收标准的集成测试
- `requirements.txt` — 项目依赖

### 快速开始

```bash
# 安装依赖
pip install -r requirements.txt

# 启动服务
python -m uvicorn auth.main:app --reload
```

### 接口示例

- `POST /api/auth/login` — 登录
- `POST /api/auth/logout` — 退出
- `GET  /api/auth/session` — 当前会话信息

### 测试

```bash
pytest
```
