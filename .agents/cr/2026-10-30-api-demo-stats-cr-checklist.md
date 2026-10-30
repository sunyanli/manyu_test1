# Code Review Checklist

> **Change** `api-demo-stats`（接口演示 + 调用埋点 + 统计报表 + 导出） · **分支/Commit** `task/DEV-966dcd0a…` / `3ca3142`（后端 manyu_test1） · **日期** 2026-10-30
>
> **AI**：唯一进度源；状态仅用 `⬜` `✅` `❌` `⚠️` `N/A`。
> **完成标准**：所有核销项必须从 `⬜` 变为其他状态；`N/A` 需写原因。
>
> **执行顺序（强制）**：已先运行 `scan-all-rules.sh`（输出见 §0），再以 LLM 完成 Step 2–5 中脚本未覆盖项与复核。

---

## 0 — 自动化预扫（`scan-all-rules.sh`，52/222 条）

被审仓库：`manyu_test1`（`src/main/java`、`src/test/java`、`src/main/resources`）

```text
=== Step 4 Rule Scan (B/M/I + A/S/G) ===
Engine:  ripgrep
[P0] G16.2 — CatchWithoutLogging: src/main/java/com/alipay/xchain/demo/service/impl/ApiCallRecordServiceImpl.java:72
[P0] G16.2 — CatchWithoutLogging: src/main/java/com/alipay/xchain/demo/service/impl/DemoExportServiceImpl.java:88
[P0] G16.2 — CatchWithoutLogging: src/main/java/com/alipay/xchain/demo/service/impl/DemoServiceImpl.java:118
[P0] G16.2 — CatchWithoutLogging: src/main/java/com/alipay/xchain/demo/track/ApiTrackAspect.java:45
[P0] G16.2 — CatchWithoutLogging: src/main/java/com/alipay/xchain/demo/track/ApiTrackAspect.java:52
[P0] G16.2 — CatchWithoutLogging: src/main/java/com/alipay/xchain/demo/track/CallerInfoResolver.java:64
[P1] M016 — JavaTimeDefaultTimeZone: ApiCallRecordServiceImpl.java:59,82 / DemoExportServiceImpl.java:64,96
[P1] M016 — JavaTimeDefaultTimeZone: 测试 DemoControllerTest.java:126,127 / ApiCallRecordServiceImplTest 6 处 /
                                      DemoExportServiceImplTest 4 处
[P2] A3.4 — LineWidthExceeded: src/main/java/com/alipay/xchain/demo/service/impl/DemoServiceImpl.java:117
=== Summary: 24 findings (P0=6, P1=17, P2=1) | 52/222 rules scanned ===
```

**复核结论（误报纠正）**：

| 脚本命中 | 复核 | 依据 |
|----------|------|------|
| `ApiCallRecordServiceImpl.java:72` | ❌ 误报 | `:74-75` 已 `LOGGER.error` 记录埋点落库失败 |
| `DemoExportServiceImpl.java:88` | ❌ 误报 | `:89` 已 `LOGGER.error("导出文件生成失败…")` |
| `DemoServiceImpl.java:118` | ❌ 误报 | `:119` 已 `LOGGER.error` 记录算法不可用 |
| `ApiTrackAspect.java:45` | ❌ 误报 | `catch (Throwable)` 后立即 `throw throwable` 再抛出，非吞异常 |
| `ApiTrackAspect.java:52` | ❌ 误报 | `:53` 已 `LOGGER.error("埋点记录失败…")` |
| `CallerInfoResolver.java:64` | ✅ 属实 | 捕获 `IllegalArgumentException` 后静默返回原文，无日志（P2） |
| `M016`（正例代码） | ✅ 属实 | 见 §4.2 G14.3/G14.4（P1） |
| `A3.4` `DemoServiceImpl.java:117` | ✅ 属实 | 该行 123 字符，超 120（P2） |

---

## Step 1 — 执行队列（产物 A）

> **Step4 列语义**：每列表示本文件对 `reliability-checklist.md` 第 **G*n*** 节、`security-checklist.md` 第 **S*n*** 节的扫描结论。
> **Bug 模式（B/M/I）** 在 §4.1 按清单 ID 核销。
>
> **列默认值说明**：未标注的 G/S 列统一为 `N/A`，共同原因——本变更为**无 MQ（G5）、无缓存（G6）、无调度（G7）、无分布式事务（G3）、无多租户（G14.2）、无文件上传（S7）、无 XML 解析（S5）、无反序列化（S6）、无外部 HTTP/RPC（G9/S3/S4）、无金额（G12.1/G14.1）、无新旧接口共存（G15.2）** 的演示型 CRUD+ 报表模块；逐 ID 原因见 §4.2 / §4.3。

| # | 文件（仓库相对路径） | 归属原因 | Step2 | Step3 | G1 | G2 | G3 | G4 | G5 | G6 | G7 | G8 | G9 | G10 | G11 | G12 | G13 | G14 | G15 | G16 | G17 | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 | S10 | 总状态 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `src/main/java/com/alipay/xchain/demo/DemoApplication.java` | REQ-1 启动/装配 | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ 已审 |
| 2 | `src/main/java/com/alipay/xchain/demo/common/ApiResponse.java` | REQ-1/REQ-4 统一响应体 | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ 已审 |
| 3 | `src/main/java/com/alipay/xchain/demo/common/BizException.java` | REQ-8 业务异常 | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ 已审 |
| 4 | `src/main/java/com/alipay/xchain/demo/common/DemoConsts.java` | REQ-1/REQ-2 常量 | ⚠️ | ⚠️ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ⚠️ 已审有问题 |
| 5 | `src/main/java/com/alipay/xchain/demo/common/ErrorCode.java` | REQ-8 错误码 | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ 已审 |
| 6 | `src/main/java/com/alipay/xchain/demo/common/GlobalExceptionHandler.java` | REQ-8 异常兜底 | ⚠️ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ⚠️ 已审有问题 |
| 7 | `src/main/java/com/alipay/xchain/demo/common/enums/ApiNameEnum.java` | REQ-2/REQ-4 接口枚举 | ⚠️ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ⚠️ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ⚠️ 已审有问题 |
| 8 | `src/main/java/com/alipay/xchain/demo/common/enums/DimensionEnum.java` | REQ-4 维度枚举 | ✅ | ⚠️ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ⚠️ 已审有问题 |
| 9 | `src/main/java/com/alipay/xchain/demo/common/enums/HashAlgorithmEnum.java` | REQ-1 哈希算法白名单 | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ 已审 |
| 10 | `src/main/java/com/alipay/xchain/demo/common/enums/SortOrderEnum.java` | REQ-1 排序顺序白名单 | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ 已审 |
| 11 | `src/main/java/com/alipay/xchain/demo/common/enums/ResultStatusEnum.java` | REQ-3 埋点结果状态 | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ 已审 |
| 12 | `src/main/java/com/alipay/xchain/demo/config/TrackExecutorConfig.java` | REQ-3 异步埋点线程池 | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ⚠️ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ⚠️ 已审有问题 |
| 13 | `src/main/java/com/alipay/xchain/demo/controller/DemoController.java` | REQ-1/REQ-2/REQ-4 入口 | ⚠️ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ⚠️ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ | N/A | N/A | ⚠️ 已审有问题 |
| 14 | `src/main/java/com/alipay/xchain/demo/dal/entity/ApiCallRecord.java` | REQ-3 埋点实体 | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ 已审 |
| 15 | `src/main/java/com/alipay/xchain/demo/dal/mapper/ApiCallRecordMapper.java` | REQ-3/REQ-4 数据访问 | ✅ | ✅ | N/A | N/A | N/A | ⚠️ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ⚠️ 已审有问题 |
| 16 | `src/main/java/com/alipay/xchain/demo/model/request/HashRequest.java` | REQ-1 入参校验 | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ 已审 |
| 17 | `src/main/java/com/alipay/xchain/demo/model/request/SortRequest.java` | REQ-1 入参校验 | ✅ | ⚠️ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ⚠️ 已审有问题 |
| 18 | `src/main/java/com/alipay/xchain/demo/model/vo/DemoResultVO.java` | REQ-1 响应结构 | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ 已审 |
| 19 | `src/main/java/com/alipay/xchain/demo/model/vo/StatsItemVO.java` | REQ-4 饼图/柱状图数据 | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ 已审 |
| 20 | `src/main/java/com/alipay/xchain/demo/model/vo/StatsReportVO.java` | REQ-4 统计报表结构 | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ 已审 |
| 21 | `src/main/java/com/alipay/xchain/demo/model/vo/StatsTrendVO.java` | REQ-4 折线图数据 | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ 已审 |
| 22 | `src/main/java/com/alipay/xchain/demo/service/ApiCallRecordService.java` | REQ-3/REQ-4 服务契约 | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ 已审 |
| 23 | `src/main/java/com/alipay/xchain/demo/service/DemoExportService.java` | REQ-2 导出契约 | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ 已审 |
| 24 | `src/main/java/com/alipay/xchain/demo/service/DemoService.java` | REQ-1 业务契约 | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ 已审 |
| 25 | `src/main/java/com/alipay/xchain/demo/service/impl/ApiCallRecordServiceImpl.java` | REQ-3/REQ-4 埋点与统计实现 | ⚠️ | ✅ | N/A | N/A | N/A | ⚠️ | N/A | N/A | N/A | N/A | N/A | N/A | ⚠️ | N/A | N/A | ❌ | N/A | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ⚠️ 已审有问题 |
| 26 | `src/main/java/com/alipay/xchain/demo/service/impl/DemoExportServiceImpl.java` | REQ-2 导出实现 | ⚠️ | ⚠️ | N/A | N/A | N/A | ❌ | N/A | N/A | N/A | ⚠️ | N/A | N/A | N/A | N/A | N/A | ❌ | N/A | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ⚠️ 已审有问题 |
| 27 | `src/main/java/com/alipay/xchain/demo/service/impl/DemoServiceImpl.java` | REQ-1 三接口实现 | ✅ | ⚠️ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ⚠️ | N/A | N/A | ⚠️ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ⚠️ 已审有问题 |
| 28 | `src/main/java/com/alipay/xchain/demo/track/ApiTrack.java` | REQ-3 埋点注解 | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ 已审 |
| 29 | `src/main/java/com/alipay/xchain/demo/track/ApiTrackAspect.java` | REQ-3 埋点切面 | ⚠️ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ | N/A | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ⚠️ | N/A | ⚠️ 已审有问题 |
| 30 | `src/main/java/com/alipay/xchain/demo/track/CallerInfoResolver.java` | REQ-3 调用人采集 | ❌ | ⚠️ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ❌ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ❌ | N/A | N/A | ⚠️ 已审有问题 |
| 31 | `src/test/java/com/alipay/xchain/demo/controller/DemoControllerTest.java` | REQ-1/3/4 接口与埋点集成测试 | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ 已审 |
| 32 | `src/test/java/com/alipay/xchain/demo/service/impl/ApiCallRecordServiceImplTest.java` | REQ-3/4 统计集成测试 | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ 已审 |
| 33 | `src/test/java/com/alipay/xchain/demo/service/impl/DemoExportServiceImplTest.java` | REQ-2 导出集成测试 | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ 已审 |
| 34 | `src/test/java/com/alipay/xchain/demo/service/impl/DemoServiceImplTest.java` | REQ-1 单元测试 | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ 已审 |
| 35 | `src/test/java/com/alipay/xchain/demo/track/CallerInfoResolverTest.java` | REQ-3 请求头解码测试 | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ 已审 |

**跳过项（非 Java，不进 LLM 逐文件队列，但已并入 §4.2/§4.3 核销）**

| 文件 | 跳过原因 |
|------|----------|
| `src/main/resources/mapper/ApiCallRecordMapper.xml` | MyBatis SQL（非 Java，已并入 Step4 G4/S1 核销） |
| `src/main/resources/db/schema-mysql.sql` | 建表脚本（非 Java） |
| `src/main/resources/db/schema-h2.sql` | 建表脚本（非 Java） |
| `src/main/resources/application.yml` | 数据源配置（非 Java） |
| `pom.xml` | 依赖声明（非 Java） |
| `docs/ARCHITECTURE.md / docs/modules/demo/README.md / .gitignore` | 文档与忽略规则（非 Java） |

**守卫**：变更包含 36 个 `.java` 文件（31 主 + 5 测试），未触发「无 Java → 终止」。
**收口**：队列 35 行全部非 `⬜`。

---

## Step 2 — 功能（产物 B）

> REQ 全部来自 `20260831-接口统计报表3.md` 原文；不符 spec 标 **P0**。

| REQ | Scenario | Spec证据（原文/章节） | 关联文件 | 状态 | 代码证据（文件/测试/接口） |
|-----|----------|----------------------|----------|------|----------------------------|
| REQ-1 | Given 用户访问页面 When 点击三个 Tab 的执行按钮 Then 分别返回 HelloWorld 消息、哈希值、排序结果与交换次数 | §4.2.1–4.2.3 GET `/api/demo/hello`、POST `/api/demo/hash`、POST `/api/demo/sort`；§5.3 Tab 功能说明 | `DemoController.java:64-92`、`DemoServiceImpl.java:41-112` | ✅ | `DemoControllerTest.java:44-98`、`DemoServiceImplTest.java:35-149` 覆盖 |
| REQ-2 | Given 有历史调用记录 When 点击导出（当前 Tab / 全部） Then 下载对应 xlsx 文件流 | §4.3 `GET /api/demo/export?type ∈ {hello,hash,sort} 且 format=xlsx`；§5.5 | `DemoController.java:123-139`、`DemoExportServiceImpl.java:62-97` | ⚠️ | `export` 已实现 type 三值+all；**`format` 参数未实现**（默认 xlsx 行为一致，故非 P0）；测试 `DemoExportServiceImplTest.java:54-113` |
| REQ-3 | Given 任意用户调用演示接口 When 请求结束 Then 异步记录调用次数+调用人（工号/姓名/类型/层级/部门）到 `api_call_record` | §4.5 埋点流程步骤 1–3；§4.5 数据表 `api_call_record` | `ApiTrackAspect.java:37-56`、`CallerInfoResolver.java:27-41`、`ApiCallRecordServiceImpl.java:50-77` | ❌ | **P0** 调用人取自客户端可伪造请求头（`CallerInfoResolver.java:35-39`），非 spec §4.5「从当前登录上下文获取」；埋点写库本身可用（`DemoControllerTest.java:110-132`） |
| REQ-4 | Given 选择维度与日期区间 When 查询统计 Then 返回该维度分类调用次数与每日趋势 | §4.4 `GET /api/demo/stats?dimension ∈ {personType,personLevel,personDept}`；§5.4 折线/饼图/柱状图数据源 | `DemoController.java:103-113`、`ApiCallRecordServiceImpl.java:79-111`、`ApiCallRecordMapper.xml:62-79` | ✅ | `ApiCallRecordServiceImplTest.java:46-105`、`DemoControllerTest.java:124-140` |
| REQ-5 | Given 页面渲染 When 切换 Tab Then 三个 Tab 各自展示执行结果 | §5.2 页面布局、§5.3 | 前端仓 `web/src/pages/Demo/ApiDemo/index.tsx:59-108` | ✅ | 三 Tab `hello/hash/sort` 与后端 `DemoApiType` 对齐 |
| REQ-6 | Given 页面顶部 When 点击导出下拉 Then 可导出当前 Tab 或全部 | §5.5 | 前端仓 `index.tsx:31-57`、`demoController.ts:62-73` | ✅ | 下拉两项与 `/api/demo/export` 的 type 取值一致 |
| REQ-7 | Given 有调用数据 When 选择维度 Then 折线图/饼图/柱状图渲染 | §5.4 | 前端仓 `CallStatsReport.tsx:96-129` | ⚠️ | 图表字段（`date/name/callCount`）与 VO 完全对齐；但受 REQ-3 影响真实链路维度值恒为「未知」，图形退化为单条数据 |
| REQ-8 | Given 异常输入 When 调用接口 Then 返回统一错误提示且失败调用记 `result_status=failure` | §7 异常处理表 6 行 | `GlobalExceptionHandler.java:24-53`、`ApiTrackAspect.java:41-47` | ⚠️ | 哈希不支持→A0401 ✅、非数字→A0400 ✅、导出空数据→可解析空表 ✅（`DemoExportServiceImplTest.java:85-97`）、统计无数据→前端 Empty ✅、**参数校验失败（400）不进入切面→不落 `failure` 埋点**（P1，见 §5 G10） |
| REQ-9 | Given 选择日期区间 When 查询/导出 Then 仅返回区间内数据，默认近 7 天 | §4.4 默认近 7 天；§5.4 | `ApiCallRecordServiceImpl.java:82-90`、`DemoExportServiceImpl.java:64-72` | ✅ | `ApiCallRecordServiceImplTest.java:88-96` 校验默认区间 |
| REQ-10 | Given 埋点建表 When 部署 Then 表结构与 spec §4.5 一致 | §4.5 数据表字段定义 | `schema-mysql.sql:2-17`、`schema-h2.sql:2-14` | ⚠️ | 全部 spec 字段齐备；额外新增 `result_summary VARCHAR(512)`（用于导出页面展示结果），属向前兼容新增列（G15.1 ✅） |

---

## Step 3 — 可读性检查（产物 C）

| ID | 检查项 | 状态 | 备注（命中写 `path:line`） |
|----|--------|------|----------------------------|
| A1 | 源文件格式 | ✅ | 文件名=类名、UTF-8、无 Tab 缩进 |
| A2 | 源文件结构/import 顺序 | ⚠️ | P2 分组顺序不符 A2.4（应 `com < jakarta < java < org`）：`DemoController.java:3-33`、`CallerInfoResolver.java:3-12` 把 `com.*` 置于 `java.*/org.*` 之后且 `jakarta.*` 垫底 |
| A3 | 代码样式 | ⚠️ | P2 A3.4 行宽超 120：`DemoServiceImpl.java:117`（123 字符，且内联全限定名 `java.nio.charset.StandardCharsets` 应上提 import）；P2 A3.2 无空 catch（✅） |
| A4 | 命名规范 | ⚠️ | P2 `DimensionEnum.column`（`:28,44-46`）为未使用字段；`DemoConsts.CONTENT_DISPOSITION`（`:36`）、`MAX_SORT_SIZE`（`:14`）定义后未被引用（死常量） |
| A5 | 编码实践 | ✅ | 实现方法均有 `@Override`，无空 catch，无 `finalize()` |
| A6 | 特定元素样式 | ✅ | 无 switch（`@ApiNameEnum` 分支用 if-else），无 C 风格数组，无 long 小写字面量 |
| A7 | Javadoc 规范 | ✅ | public 类/方法（含 Mapper、Service 契约、枚举 `of()`）均有 Javadoc 与 `@param/@return`；`DemoServiceImpl:89-112` 私有方法亦有 |

---

## Step 4 — 可靠性检查（产物 D）

### 4.1 Bug 模式（`bug-pattern-checklist.md`，B001–B081 / M001–M027 / I001–I010）

> 未列出的 ID 均为 **N/A**：本变更为 Spring Boot 演示模块，不含对应代码形态（数组/浮点/日期工具误用、JDBC 直连、JUnit3/4 混用、Mockito 误用、集合自修改、Unsafe、Money、`Optional`、`ThreadLocal`、`switch` 枚举、`Calendar`、`StringBuilder(char)`、`substring(0)` 等）。下表列出**有结论**的 ID 与**易误判需显式说明**的 ID。

| ID | 状态 | 备注（命中写 `path:line`） |
|----|------|----------------------------|
| B001 | ✅ | 已逐一核对，未命中：无字面量必抛的 parse/of 调用 |
| B002 | N/A | 无对应代码形态（见本节说明） |
| B003 | N/A | 无对应代码形态（见本节说明） |
| B004 | N/A | 无对应代码形态（见本节说明） |
| B005 | N/A | 无对应代码形态（见本节说明） |
| B006 | ✅ | 已逐一核对，未命中：测试用 AssertJ `assertThat(...).isEqualTo(...)`，参数顺序语义正确 |
| B007 | N/A | 无对应代码形态（见本节说明） |
| B008 | ✅ | 未使用 `Executors`，`TrackExecutorConfig.java:26-36` 走 `ThreadPoolTaskExecutor` 显式参数 |
| B009 | N/A | 无对应代码形态（见本节说明） |
| B010 | ✅ | 已逐一核对，未命中：无 `new BigDecimal(double)` |
| B011 | ✅ | 已逐一核对，未命中：`Long` 比较走 `assertThat(...).isEqualTo(3L)`，无 `==` |
| B012 | N/A | 无对应代码形态（见本节说明） |
| B013 | N/A | 无对应代码形态（见本节说明） |
| B014 | N/A | 无对应代码形态（见本节说明） |
| B015 | N/A | 无对应代码形态（见本节说明） |
| B016 | N/A | 无对应代码形态（见本节说明） |
| B017 | N/A | 无对应代码形态（见本节说明） |
| B018 | N/A | 无对应代码形态（见本节说明） |
| B019 | N/A | 无对应代码形态（见本节说明） |
| B020 | N/A | 无对应代码形态（见本节说明） |
| B021 | N/A | 无对应代码形态（见本节说明） |
| B022 | ✅ | `DateTimeFormatter` 替代 `SimpleDateFormat`：`DemoServiceImpl.java:35`、`DemoExportServiceImpl.java:51` |
| B023 | N/A | 无对应代码形态（见本节说明） |
| B024 | N/A | 无对应代码形态（见本节说明） |
| B025 | N/A | 无对应代码形态（见本节说明） |
| B026 | N/A | 无对应代码形态（见本节说明） |
| B027 | N/A | 无对应代码形态（见本节说明） |
| B028 | N/A | 无对应代码形态（见本节说明） |
| B029 | N/A | 无对应代码形态（见本节说明） |
| B030 | ✅ | 已逐一核对，未命中：无浮点相等比较 |
| B031 | N/A | 无对应代码形态（见本节说明） |
| B032 | N/A | 无对应代码形态（见本节说明） |
| B033 | N/A | 无对应代码形态（见本节说明） |
| B034 | N/A | 无对应代码形态（见本节说明） |
| B035 | N/A | 无对应代码形态（见本节说明） |
| B036 | N/A | 无对应代码形态（见本节说明） |
| B037 | N/A | 无对应代码形态（见本节说明） |
| B038 | N/A | 无对应代码形态（见本节说明） |
| B039 | N/A | 无对应代码形态（见本节说明） |
| B040 | N/A | 无对应代码形态（见本节说明） |
| B041 | N/A | 无对应代码形态（见本节说明） |
| B042 | N/A | 无对应代码形态（见本节说明） |
| B043 | N/A | 无对应代码形态（见本节说明） |
| B044 | N/A | 无对应代码形态（见本节说明） |
| B045 | N/A | 无对应代码形态（见本节说明） |
| B046 | N/A | 无对应代码形态（见本节说明） |
| B047 | N/A | 无对应代码形态（见本节说明） |
| B048 | N/A | 无对应代码形态（见本节说明） |
| B049 | N/A | 无对应代码形态（见本节说明） |
| B050 | N/A | 无对应代码形态（见本节说明） |
| B051 | N/A | 无对应代码形态（见本节说明） |
| B052 | N/A | 无对应代码形态（见本节说明） |
| B053 | ✅ | 已逐一核对，未命中：`assertThatThrownBy` 自带失败语义，无 `try/catch` 吞断言 |
| B054 | N/A | 无对应代码形态（见本节说明） |
| B055 | ✅ | 已逐一核对，未命中：无 Mockito 使用（全部 `@SpringBootTest` 集成/纯单测） |
| B056 | N/A | 无对应代码形态（见本节说明） |
| B057 | ✅ | 已逐一核对，未命中：无增强 for 循环内改集合（`DemoServiceImpl.bubbleSort` 用索引 `set`） |
| B058 | N/A | 无对应代码形态（见本节说明） |
| B059 | N/A | 无对应代码形态（见本节说明） |
| B060 | N/A | 无对应代码形态（见本节说明） |
| B061 | N/A | 无对应代码形态（见本节说明） |
| B062 | N/A | 无对应代码形态（见本节说明） |
| B063 | N/A | 无对应代码形态（见本节说明） |
| B064 | ✅ | 已逐一核对，未命中：未使用 `Optional` |
| B065 | N/A | 无对应代码形态（见本节说明） |
| B066 | N/A | 无对应代码形态（见本节说明） |
| B067 | N/A | 无对应代码形态（见本节说明） |
| B068 | N/A | 无对应代码形态（见本节说明） |
| B069 | N/A | 无对应代码形态（见本节说明） |
| B070 | N/A | 无对应代码形态（见本节说明） |
| B071 | ✅ | 已逐一核对，未命中：无 `size() >= 0` |
| B072 | N/A | 无对应代码形态（见本节说明） |
| B073 | N/A | 无对应代码形态（见本节说明） |
| B074 | N/A | 无对应代码形态（见本节说明） |
| B075 | N/A | 无对应代码形态（见本节说明） |
| B076 | ✅ | 无 `@Transactional`；`record()` 单条 insert 无需事务 |
| B077 | N/A | 无对应代码形态（见本节说明） |
| B078 | N/A | 无对应代码形态（见本节说明） |
| B079 | ✅ | 测试无 `@Mock` 显式赋值 |
| B080 | ✅ | 5 个测试类共 34 个用例均含 assertThat/assertThatThrownBy 断言 |
| B081 | N/A | 无对应代码形态（见本节说明） |
| M001 | ✅ | 已逐一核对，未命中：无重复条件分支 |
| M002 | N/A | 无对应代码形态（见本节说明） |
| M003 | N/A | 无对应代码形态（见本节说明） |
| M004 | ✅ | 无 `printStackTrace()`，异常统一走 `LOGGER.error` |
| M005 | ✅ | 已逐一核对，未命中：`ApiTrackSummaryBuilder`（`ApiTrackAspect.java:64`）已声明 `static final` |
| M006 | N/A | 无对应代码形态（见本节说明） |
| M007 | ✅ | 无空 catch：`ApiCallRecordServiceImpl.java:72-76` 等均带日志或注释 |
| M008 | ✅ | 已逐一核对，未命中：POJO 均为 Lombok `@Data` 生成 equals/hashCode，成对生成 |
| M009 | N/A | 无对应代码形态（见本节说明） |
| M010 | N/A | 无对应代码形态（见本节说明） |
| M011 | ✅ | 无 switch 语句 |
| M012 | ✅ | 无 finally 中 return/throw：`ApiTrackAspect.java:48-55` 仅记录埋点 |
| M013 | ✅ | 已逐一核对，未命中：无浮点强转运算 |
| M014 | N/A | 无对应代码形态（见本节说明） |
| M015 | N/A | 无对应代码形态（见本节说明） |
| M016 | ❌ | P1 依赖 JVM 默认时区：`ApiCallRecordServiceImpl.java:59,82`、`DemoExportServiceImpl.java:64,96`、`DemoServiceImpl.java:125`、测试 `ApiCallRecordServiceImplTest.java:57,65,77,82,93,94,102`、`DemoExportServiceImplTest.java:57,74,90,102`、`DemoControllerTest.java:126,127` |
| M017 | N/A | 无对应代码形态（见本节说明） |
| M018 | ✅ | 已逐一核对，未命中：无显式 Lock 使用 |
| M019 | N/A | 无对应代码形态（见本节说明） |
| M020 | ✅ | 实现类方法均带 `@Override` |
| M021 | ✅ | 已逐一核对，未命中：无自定义 `equals(SpecificType)` |
| M022 | ✅ | 未使用 `Optional` |
| M023 | N/A | 无对应代码形态（见本节说明） |
| M024 | ✅ | 已逐一核对，未命中：无 `Optional.get()` |
| M025 | N/A | 无对应代码形态（见本节说明） |
| M026 | N/A | 无对应代码形态（见本节说明） |
| M027 | ✅ | 未使用 `ThreadLocal` |
| I001 | N/A | 无对应代码形态（见本节说明） |
| I002 | N/A | 无对应代码形态（见本节说明） |
| I003 | N/A | 无对应代码形态（见本节说明） |
| I004 | ✅ | 未使用 `java.util.Date` |
| I005 | N/A | 无对应代码形态（见本节说明） |
| I006 | N/A | 无对应代码形态（见本节说明） |
| I007 | N/A | 无对应代码形态（见本节说明） |
| I008 | N/A | 无对应代码形态（见本节说明） |
| I009 | N/A | 无对应代码形态（见本节说明） |
| I010 | N/A | 无对应代码形态（见本节说明） |

> **I009/I010** 为统计类规则：I009 仅统计用途、I010 校验是否需容器启动——本项目 5 个测试类中 4 个用 `@SpringBootTest`（集成测试语义），`DemoServiceImplTest`/`CallerInfoResolverTest` 为纯单测，分层合理，故 I010 记 `N/A`（无需迁移）。

### 4.2 可靠性（`reliability-checklist.md`）

| ID | 状态 | 备注 |
|----|------|------|
| G1.1 | N/A | 无事务内「先读后写」共享资源并发场景（埋点为单条 insert） |
| G1.2 | N/A | 无加锁/乐观锁更新 |
| G1.3 | N/A | 无乐观锁重试 |
| G1.4 | N/A | 无多资源加锁 |
| G2.1 | N/A | 埋点为追加流水记录，无幂等键诉求（spec §9 数据量可控） |
| G2.2 | N/A | 无重试/MQ 重投路径 |
| G2.3 | N/A | 无幂等键约定 |
| G3.1 | N/A | 单库本地操作，无分布式事务 |
| G3.2 | N/A | 无 `@Transactional`，不存在长事务包外部 IO |
| G4.1 | ✅ | 聚合逻辑在 Java（`ApiCallRecordServiceImpl.java:98-110`），SQL 仅 GROUP BY |
| G4.2 | ⚠️ | P1 `trendByDimension` 对索引列做函数运算：`ApiCallRecordMapper.xml:72,77` `CAST(call_time AS DATE)`，既使 `idx_call_time` 失效，又与 `call_time >= ? AND < ?` 的区间条件叠加导致全表/全索引扫 |
| G4.3 | ❌ | P1 `selectForExport` 无 LIMIT/分页：`ApiCallRecordMapper.xml:81-86`；`DemoExportServiceImpl.java:79` 全量载入内存 |
| G5.1 | N/A | 无 MQ |
| G6.1 | N/A | 无缓存 |
| G6.2 | N/A | 无缓存双写 |
| G7.1 | N/A | 无调度任务 |
| G7.2 | N/A | 无调度任务 |
| G8.1 | ⚠️ | P2 `CallerInfoResolver.java:64-67` catch `IllegalArgumentException` 后静默按原文返回，无日志 |
| G8.2 | ✅ | 埋点为非核心链路且已异步化；`TrackExecutorConfig.java:32` 队列满走 CallerRunsPolicy 兜底不丢埋点 |
| G8.3 | ✅ | `DemoExportServiceImpl.java:74-75` try-with-resources 关闭 Workbook/ByteArrayOutputStream |
| G8.4 | ✅ | `TrackExecutorConfig.java:33` `setWaitForTasksToCompleteOnShutdown(true)` |
| G8.5 | N/A | 未使用 ThreadLocal |
| G8.6 | ✅ | 未用 `Executors` 默认线程池，全部显式参数 |
| G9.1 | N/A | 无 RPC/HTTP 外部调用 |
| G9.2 | N/A | 无外部调用超时配置诉求（DB 由连接池管理） |
| G9.3 | N/A | 无重试 |
| G10.1 | ⚠️ | P1 `ApiNameEnum.of()` 非法值返回 null（`ApiNameEnum.java:42-49`），`DemoController.java:112` 把 null 当作「不过滤」，非法 apiName 被静默降级为全量统计且无任何提示；与 `DimensionEnum.of()` 抛错语义不一致 |
| G10.2 | N/A | 首版接口，无版本化诉求 |
| G11.1 | ✅ | 5 个测试类覆盖接口/服务/导出/埋点/解码，`mvn -o test` 34 用例全通过 |
| G11.2 | ⚠️ | P2 未覆盖：导出大数据量、统计跨天边界（00:00 前后）、异步埋点线程池打满、并发调用 |
| G11.3 | ⚠️ | P1 服务层入参无防御：`DemoServiceImpl.java:52` `request.getInput().length()`.getBytes 与 `:69` `new ArrayList<>(request.getNumbers())` 在 null 入参下 NPE（Web 层 `@Valid` 已兜底，故定 P1） |
| G11.4 | N/A | 无金额/浮点运算 |
| G12.1 | N/A | 无资金场景 |
| G12.2 | ⚠️ | P2 无埋点写入的功能开关，DB 故障时只能靠 catch 降级日志（`ApiCallRecordServiceImpl.java:72`） |
| G13.1 | ✅ | 日志级别正确：业务异常 WARN、系统异常 ERROR、正常流程 INFO |
| G14.1 | N/A | 无金额 |
| G14.2 | N/A | 单租户演示应用 |
| G14.3 | ❌ | P1 `LocalDateTime.now()` 取 JVM 本地时区后直接落库（`ApiCallRecordServiceImpl.java:59`、`DemoExportServiceImpl.java:64,96`），跨时区部署时统计口径漂移；应按约定时区/UTC 归一 |
| G14.4 | ⚠️ | P1 `DateTimeFormatter.ofPattern` 未绑定 Zone：`DemoServiceImpl.java:35-36`（配合 `ZonedDateTime.now()` 尚自洽）、`DemoExportServiceImpl.java:51`（作用于无时区的 `LocalDateTime`，导出时间列语义依赖部署时区） |
| G15.1 | ✅ | 新表 `api_call_record` 为纯新增，不改动既有表结构；较 spec 新增 `result_summary` 列为可选列，向前兼容 |
| G15.2 | N/A | 无新旧接口共存 |
| G15.3 | N/A | 首版无灰度切换诉求 |
| G16.1 | ⚠️ | P2 埋点链路缺指标（写入成功率、线程池队列长度、导出耗时），仅日志可见（`TrackExecutorConfig.java:26-36`） |
| G16.2 | ❌ | P2 `CallerInfoResolver.java:64-67` 捕获后无日志、无上下文，线上无法追溯请求头解码异常 |
| G16.3 | ✅ | 级别使用正确（`GlobalExceptionHandler.java:27,37,44,51`） |
| G16.4 | ✅ | 无空 catch，未出现仅 printStackTrace |
| G17.1 | ⚠️ | P2 无功能开关（配置中心）可实时关闭埋点/导出 |
| G17.2 | ⚠️ | P2 导出/统计异常无兜底返回（`DemoExportServiceImpl.java:88-91` 直接抛 500） |
| G17.3 | N/A | 无存量数据变更，仅新增表 |
| G4.4 | N/A | 参考清单 G4 仅定义 G4.1–G4.3（模板占位项，无对应规则） |
| G8.7 | N/A | 参考清单 G8 仅定义 G8.1–G8.6（模板占位项，无对应规则） |
| G10.3 | N/A | 参考清单 G10 仅定义 G10.1–G10.2（模板占位项，无对应规则） |
| G18.1 | N/A | 参考清单未定义 G18 章节（模板占位项，无对应规则） |
| G18.2 | N/A | 参考清单未定义 G18 章节（模板占位项，无对应规则） |
| G18.3 | N/A | 参考清单未定义 G18 章节（模板占位项，无对应规则） |

### 4.3 安全（`security-checklist.md`）

| ID | 状态 | 备注 |
|----|------|------|
| S1.1 | ✅ | 全部 `#{}` 预编译：`ApiCallRecordMapper.xml:47-59` |
| S1.2 | ✅ | 维度列名经 `<choose>` 白名单静态展开：`ApiCallRecordMapper.xml:37-44`（未使用 `${}`）；`order by` 为固定字面量 |
| S1.3 | N/A | 无 like / in 查询 |
| S2.1 | N/A | 后端仅返回 JSON/文件流，无 HTML 渲染 |
| S2.2 | N/A | 无富文本 |
| S2.3 | N/A | 无模板引擎 |
| S3.1 | N/A | 无外部 URL 请求 |
| S3.2 | N/A | 无 302 跳转 |
| S3.3 | N/A | 无外部调用 |
| S4.1 | N/A | 无命令执行 |
| S4.2 | N/A | 无外部命令调用 |
| S5.1 | N/A | 无 XML 解析（MyBatis DTD 由框架处理） |
| S5.2 | N/A | 无 XPath |
| S6.1 | N/A | 无 Java 反序列化 |
| S6.2 | ✅ | Jackson 默认，未启用 `@JsonTypeInfo` 多态 |
| S6.3 | N/A | 无敏感字段凭证 |
| S7.1 | N/A | 无文件上传 |
| S7.2 | ✅ | 导出为响应流下载，文件名仅来自枚举+M 常量拼接，无路径穿越（`DemoExportServiceImpl.java:95-97`） |
| S7.3 | N/A | 无落盘文件 |
| S8.1 | ❌ | P0 调用人身份完全取自客户端可控请求头（`CallerInfoResolver.java:35-39`：`X-User-Id/X-Person-Type/...`），未做任何验签/会话校验，任意调用方可伪造工号与部门，直接污染按人员类型/层级/部门聚合的统计报表；与 spec §4.5 步骤 2「从当前登录上下文获取调用人信息」不符 |
| S8.2 | ✅ | GET 接口（hello/stats/export）均为只读，POST 才产生副作用 |
| S8.3 | N/A | 主键自增，无对外暴露的可枚举敏感 ID 查询 |
| S8.4 | N/A | 无 Cookie 读写 |
| S9.1 | ✅ | 无硬编码密钥；`application.yml:10-11` 为空口令的 H2 演示库 |
| S9.2 | ⚠️ | P2 `result_summary` 落库哈希原文与排序输入（`ApiTrackAspect.java:81,84`），哈希原文可能为口令类敏感数据，导出接口会原样带出 |
| S9.3 | N/A | 传输加密由网关/容器负责，本次无变更 |
| S9.4 | N/A | 无随机数使用 |
| S10.1 | N/A | 无 Cookie 会话的增删改接口 |
| S10.2 | N/A | 未配置 CORS |
| S10.3 | N/A | 无跳转 |

> **S8.1 补充**：spec §9「实施边界」明确「不涉及权限控制（所有登录用户均可访问）」，故**鉴权本身**不作要求；但「身份来源必须可信」不等于鉴权，请求头可写导致的**统计口径可被任意篡改**仍按 P0 处理。

---

## Step 5 — 自定义扩展检查（产物 E）

### 5.1 自定义扩展（`customized-checklist.md`）

| ID | 状态 | 备注 |
|----|------|------|
| U1.1 | ✅ | 示例项「Controller 入参必须使用统一校验注解」——`DemoController.java:78,90` 的 `hash`/`sort` 已用 `@Valid`；`stats`/`export` 为 query 参数，走枚举白名单解析后抛 `BizException`，等效受控 |
| U1.2 | N/A | 参考清单 U1 仅定义 U1.1 示例项，未启用其他团队约束 |
| U1.3 | N/A | 同上 |
| U2.1 | N/A(未启用自定义规则) | `customized-checklist.md` §U2 业务红线为空表 |
| U2.2 | N/A(未启用自定义规则) | 同上 |
| U2.3 | N/A(未启用自定义规则) | 同上 |

---

## 终检（防漏检）

- [x] 执行队列中每个文件 `Step2`、`Step3`、**S1–S10 / G1–G17** 各列均非 `⬜`（跳过文件除外）；
- [x] Step 2 的每个 REQ/Scenario 均非 `⬜`（REQ-1…REQ-10）；
- [x] Step 3 的 A1–A7 均非 `⬜`；
- [x] Step 4 全部 **G/S** 与 **B001–B081 / M001–M027 / I001–I010** ID 均非 `⬜`（N/A 均附原因）；
- [x] Step 5 全部 U* ID 均非 `⬜`；
- [x] 所有 `❌/⚠️` 已写入 report（`2026-10-30-api-demo-stats-code-review.md`），且包含 `ID + path:line`。
