# xchain 接口演示与调用统计报表 — 架构说明

## 1. 范围

本工程提供「接口演示中心」的后端能力：三个演示接口（HelloWorld、哈希算法、冒泡排序）、
调用埋点、多维度统计报表与 Excel 导出。

## 2. 模块划分

| 模块 | 包路径 | 职责 |
|------|--------|------|
| common | `com.alipay.xchain.demo.common` | 统一响应体、错误码、业务异常、全局异常处理、常量、枚举 |
| dal | `com.alipay.xchain.demo.dal` | 埋点实体与 MyBatis Mapper（`api_call_record`） |
| model | `com.alipay.xchain.demo.model` | 请求 DTO 与返回 VO |
| track | `com.alipay.xchain.demo.track` | 埋点注解、调用人解析、埋点切面 |
| service | `com.alipay.xchain.demo.service` | 演示业务、埋点统计、导出三类服务 |
| controller | `com.alipay.xchain.demo.controller` | REST 入口 |
| config | `com.alipay.xchain.demo.config` | 埋点异步线程池 |

## 3. 分层约束

- Controller 只做参数接收与响应包装，不含业务逻辑；
- Service 接口与实现分离，实现类统一以 `Impl` 结尾；
- DAL 只暴露 Mapper 接口，SQL 全部落在 `resources/mapper/*.xml`；
- 所有对外响应统一为 `ApiResponse<T>`，错误统一由 `GlobalExceptionHandler` 转换；
- 埋点写入异步执行，任何埋点异常只记录日志，不影响接口主流程。

## 4. 接口清单

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/demo/hello` | HelloWorld 演示 |
| POST | `/api/demo/hash` | 哈希算法演示（MD5 / SHA-1 / SHA-256） |
| POST | `/api/demo/sort` | 冒泡排序演示（asc / desc） |
| GET | `/api/demo/stats` | 按人员类型/层级/部门维度统计调用情况 |
| GET | `/api/demo/export` | 导出页面展示结果为 Excel |

## 5. 数据模型

埋点表 `api_call_record`（H2 演示库见 `resources/db/schema-h2.sql`，
生产 MySQL DDL 见 `resources/db/schema-mysql.sql`）。

在规格给定的字段之外新增 `result_summary`（VARCHAR(512)），用于承载页面展示结果摘要，
从而支持「导出各个页面的展示结果」；该字段为追加字段，不影响已有调用方。

## 6. 仓间契约（前端 `manyu_test/web`）

| 契约 | 后端 | 前端 |
|------|------|------|
| 响应结构 | `ApiResponse<T>`：`success / errorCode / errorMessage / userTip / data` | `src/services/xchain/typing.ts` 同构声明 |
| 演示接口 | `/api/demo/hello`、`/hash`、`/sort` | `demoController.ts` 的 `fetchHello/fetchHash/fetchSort` |
| 统计维度 | `personType` / `personLevel` / `personDept` | `StatsDimension` 联合类型 + 维度下拉 |
| 图表数据 | `items[{name,callCount}]`、`trend[{date,name,callCount}]` | 饼图/柱状图消费 `items`，折线图按 `name` 分组消费 `trend` |
| 导出 | `GET /api/demo/export?type=hello&hash&sort&all`，返回 xlsx 流 | `exportDemoResult` + `downloadBlob` |
| 调用人 | 请求头 `X-User-Id`、`X-User-Name`、`X-Person-Type`、`X-Person-Level`、`X-Person-Dept` | 由登录态网关注入 |

## 7. 运行与验证

```bash
# 依赖：JDK 17、Maven 3.9+
mvn test            # 单元测试 + 集成测试（H2 内存库）
mvn -DskipTests package
java -jar target/xchain-demo-api-1.0.0.jar --server.port=18080
```
