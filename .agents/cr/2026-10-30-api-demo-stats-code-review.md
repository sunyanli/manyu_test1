# Code Review Report

> **Change** `api-demo-stats`（接口演示 + 调用埋点 + 多维统计报表 + Excel 导出） · **分支/Commit** `task/DEV-966dcd0a…` / `3ca3142`（后端 `manyu_test1`）、`a4721a1`（前端 `manyu_test` 参考） · **日期** 2026-10-30 · **审查者** AI
>
> **AI**：等级 **P0 / P1 / P2**；G/S 以 checklist 行内定义为准；Bug 模式以 `bug-pattern-checklist.md` 表头为准（Blocker→P0、Major→P1、Info→P2）。已先运行 `scan-all-rules.sh`（24 findings，6 条 P0 经复核全部为误报，见 checklist §0），再写 LLM 结论。
>
> 配套进度源：`2026-10-30-api-demo-stats-cr-checklist.md`（同目录）。

---

## 1. 审查范围

| 项 | 值 |
|----|-----|
| `.java` 文件数 | `36`（31 主代码 + 5 测试；另有 5 个非 Java 资源文件并入 Step4 核销） |
| 变更行数 | `+2732 / -0`（后端 `3ca3142`）；前端参考 `+705 / -0`（`a4721a1`，只读核对契约） |
| 构建与测试 | `mvn -o -B test` **BUILD SUCCESS**，5 个测试类 34 个用例全部通过（`Tests run: 9/5/5/9/6, Failures: 0, Errors: 0`） |

| 类/接口 | 路径 | 角色 |
|---------|------|------|
| `DemoController` | `src/main/java/com/alipay/xchain/demo/controller/DemoController.java` | 5 个 REST 入口（hello/hash/sort/stats/export） |
| `DemoServiceImpl` / `DemoService` | `src/main/java/com/alipay/xchain/demo/service/impl/DemoServiceImpl.java` | 三接口业务实现（MessageDigest / 冒泡排序） |
| `DemoExportServiceImpl` / `DemoExportService` | `src/main/java/com/alipay/xchain/demo/service/impl/DemoExportServiceImpl.java` | POI 生成 xlsx（3 业务页 + 统计页） |
| `ApiCallRecordServiceImpl` / `ApiCallRecordService` | `src/main/java/com/alipay/xchain/demo/service/impl/ApiCallRecordServiceImpl.java` | 埋点落库 + 维度聚合查询 |
| `ApiTrackAspect` / `@ApiTrack` | `src/main/java/com/alipay/xchain/demo/track/ApiTrackAspect.java` | `@Around` 切面，异步埋点 + 结果摘要 |
| `CallerInfoResolver` / `CallerInfo` | `src/main/java/com/alipay/xchain/demo/track/CallerInfoResolver.java` | 调用人身份解析（请求头 → 工号/类型/层级/部门） |
| `TrackExecutorConfig` | `src/main/java/com/alipay/xchain/demo/config/TrackExecutorConfig.java` | 埋点专用线程池（CallerRunsPolicy） |
| `ApiCallRecordMapper` + XML | `src/main/java/…/dal/mapper/ApiCallRecordMapper.java`、`src/main/resources/mapper/ApiCallRecordMapper.xml` | 插入/维度聚合/日趋势/导出明细 |
| 枚举 5 个 | `src/main/java/com/alipay/xchain/demo/common/enums/*.java` | ApiName / Dimension / HashAlgorithm / SortOrder / ResultStatus |
| VO 4 个 + Request 2 个 | `src/main/java/com/alipay/xchain/demo/model/**` | 契约结构 |
| 测试 5 个 | `src/test/java/com/alipay/xchain/demo/**` | Controller 集成、埋点、导出、算法、头解码 |

---

## 2. 问题计数

| P0 | P1 | P2 |
|----|----|-----|
| 2 | 6 | 10 |

---

## 3. Step 2 — 功能（REQ）

> REQ 全部取自 `20260831-接口统计报表3.md` 原文；功能性不符统一 **P0**。

### REQ-1: 三个演示接口（hello / hash / sort）

| Scenario | 结果 | Spec证据 | 代码证据 | 说明 |
|----------|------|----------|----------|------|
| 调用三接口返回对应结果 | ✅ | §4.2.1–4.2.3 接口定义与响应示例 | `DemoController.java:64-92`、`DemoServiceImpl.java:41-112`；`DemoServiceImplTest.java:35-149` | 哈希支持 MD5/SHA-1/SHA-256，默认 SHA-256；排序 asc/desc 默认 asc，返回 `swapCount` |
| 时间戳格式 `2026-08-31T10:00:00+08:00` | ⚠️ | §4.2.1 响应示例 `timestamp` | `DemoServiceImpl.java:35-36,124-126` | 格式串 `yyyy-MM-dd'T'HH:mm:ssXXX` 正确，但取值源于 `ZonedDateTime.now()` 的 JVM 默认时区（见 P1-3） |

### REQ-2: 统一导出接口

| Scenario | 结果 | Spec证据 | 代码证据 | 说明 |
|----------|------|----------|----------|------|
| 按 Tab 导出（hello/hash/sort）与导出全部 | ✅ | §4.3 `GET /api/demo/export?type=…`、§5.5 | `DemoController.java:123-139`、`DemoExportServiceImpl.java:62-114`；`DemoExportServiceImplTest.java:54-97` | 单 Tab 2 页（业务页 + 统计页），all 4 页 |
| `format=xlsx` 参数 | ⚠️ | §4.3 `format：可选，默认 xlsx` | `DemoController.java:124-129` | **`format` 参数未声明**，始终输出 xlsx；因默认值行为一致，定 P2（P2-9） |
| 空数据返回可解析空表 | ✅ | §7「导出数据为空 → 返回空 Excel 文件」 | `DemoExportServiceImplTest.java:85-97` | `getLastRowNum()==0` |

### REQ-3: 调用埋点（调用次数 + 调用人）

| Scenario | 结果 | Spec证据 | 代码证据 | 说明 |
|----------|------|----------|----------|------|
| 每次调用自动写 `api_call_record` | ✅ | §4.5 埋点流程步骤 1/3（AOP 拦截 + 异步写库） | `ApiTrackAspect.java:37-56`、`ApiCallRecordServiceImpl.java:50-77`；`DemoControllerTest.java:110-122` | 异步 2/4 线程 + 队列 1024，CallerRunsPolicy 兜底 |
| 调用人来自**当前登录上下文** | ❌ | §4.5 步骤 2「从当前登录上下文获取调用人信息」 | `CallerInfoResolver.java:27-41` | **仅取 `X-User-Id`/`X-Person-Type` 等可任意伪造的请求头，无任何会话/网关校验**（P0-1） |
| 记录失败状态 `result_status=failure` | ⚠️ | §7「接口调用失败 → 埋点记录 `result_status=failure`」 | `ApiTrackAspect.java:37-56` | 切面正常包住业务异常场景，但 `@Valid` 参数校验在进入 Controller 方法前失败，**不经过切面 → 400 请求不产生任何埋点**（P1-6） |

### REQ-4: 按人员类型 / 层级 / 部门多维统计

| Scenario | 结果 | Spec证据 | 代码证据 | 说明 |
|----------|------|----------|----------|------|
| 三维度聚合 + 每日趋势 | ✅ | §4.4 `dimension=personType/personLevel/personDept`、§5.4 | `DemoController.java:103-113`、`ApiCallRecordServiceImpl.java:79-111`、`ApiCallRecordMapper.xml:62-79`；`ApiCallRecordServiceImplTest.java:46-105` | 列名白名单 `<choose>` 静态展开 |
| 维度枚举前后端对齐 | ✅ | §6 对齐点「维度枚举前后端对齐」 | `DimensionEnum.java:16-22` ↔ `typing.ts:5` | `personType/personLevel/personDept` 完全一致 |
| 真实前端链路维度有区分度 | ❌ | §5.4「选定维度下各分类的调用占比/对比」、§6「埋点数据前端无需额外埋点代码」 | 前端 `demoController.ts:24-48`（无身份头）+ `CallerInfoResolver.java:35-39` | **前端从不发送身份头、后端也无登录上下文 → 三个维度取值恒为「未知」，饼图/柱状图退化为单分类，折线图仅一条序列**（P0-2） |

### REQ-5 ~ REQ-10（其余功能点）

| REQ | Scenario | 结果 | Spec证据 | 代码证据 |
|-----|----------|------|----------|----------|
| REQ-5 | 页面三个 Tab 展示执行结果 | ✅ | §5.2/§5.3 | `index.tsx:59-108`、`HelloWorldPanel/HashPanel/SortPanel` |
| REQ-6 | 顶部导出按钮（当前 Tab / 全部） | ✅ | §5.5 | `index.tsx:31-57`、`demoController.ts:62-85` |
| REQ-7 | 折线/饼图/柱状图渲染 | ⚠️ | §5.4 | `CallStatsReport.tsx:96-129`；图表字段与 VO 对齐，但受 P0-2 影响数据无区分度 |
| REQ-8 | 统一异常提示 | ✅ | §7 异常处理表 | `GlobalExceptionHandler.java:24-53`（A0400/A0401/A0402/A0403/B0001） |
| REQ-9 | 日期区间筛选，默认近 7 天 | ✅ | §4.4、§5.4 | `ApiCallRecordServiceImpl.java:82-90`；`ApiCallRecordServiceImplTest.java:88-96` |
| REQ-10 | 建表结构符合 spec §4.5 | ⚠️ | §4.5 字段表 | `schema-mysql.sql:2-17` 字段齐备，额外新增 `result_summary VARCHAR(512)`（向前兼容，G15.1 ✅） |

---

## 4. Step 3 — 可读性检查

| 结果 | 说明（违规写 Ax.x 与 `path:行`） |
|------|--------------------------------|
| ⚠️ | **A1 ✅** 文件名=类名、UTF-8、4 空格无 Tab。**A2 ⚠️ P2**：import 分组顺序不符 A2.4（`com < jakarta < java < org`），`DemoController.java:3-33` 把 `com.*` 排在 `java.*/org.*` 之后、`jakarta.*` 垫底；`CallerInfoResolver.java:3-12`、`HashRequest.java:3-8`、`SortRequest.java:3-8` 同类。同文件 `DemoApplication.java:3-6` 顺序正确，说明规范未统一。**A3 ⚠️ P2**：`DemoServiceImpl.java:117` 123 字符超 A3.4 且内联全限定名 `java.nio.charset.StandardCharsets` 应上提 import。**A4 ⚠️ P2**：`DimensionEnum.java:28,44-46` 的 `column` 字段全程未被使用（Mapper 走 XML 白名单）；`DemoConsts.java:14` `MAX_SORT_SIZE`、`:36` `CONTENT_DISPOSITION` 定义后无引用。**A5 ✅** 实现方法均有 `@Override`、无空 catch。**A6 ✅** 无 switch/C 风格数组。**A7 ✅** public 契约与枚举 `of()` 均有 Javadoc |

---

## 5. Step 4 — 可靠性检查

| 域 | 参考 | 结果 | 等级 | 说明（列命中 ID 或「已扫无命中」） |
|----|------|------|------|-------------------------------------|
| 可靠性 | `reliability-checklist.md` G1–G17 | ❌ | P1 / P2 | **G4.2** `Mapper.xml:72,77` 对索引列 `CAST(call_time AS DATE)` 致索引失效（P1-2）；**G4.3** `Mapper.xml:81-86` 导出明细无 LIMIT（P1-1）；**G14.3/G14.4** 时区未显式指定（P1-3）；**G10.1** 非法 `apiName` 静默降级（P1-4）；**G11.3** 服务层入参无 null 防御（P1-5）；**G11.2** 边界用例缺失（P2-5）；**G8.1/G16.2** `CallerInfoResolver.java:64-67` 静默 catch（P2-4）；**G16.1** 埋点链路无指标（P2-6）；**G12.2/G17.1/G17.2** 无开关与降级预案（P2-7）。G1/G2/G3/G5/G6/G7/G9 全 N/A（无并发共享写、无 MQ、无缓存、无调度、无外部调用） |
| 安全 | `security-checklist.md` S1–S10 | ❌ | P0 / P2 | **S8.1** 调用人身份取自客户端可写请求头（P0-1）；**S9.2** `result_summary` 落库哈希原文并原样导出（P2-8）；S1.1/S1.2 ✅ 全 `#{}` 预编译 + 列名白名单；S7.2 ✅ 文件名不含用户可控路径；S2–S6/S10 N/A（无 HTML 渲染、无外部请求、无反序列化） |
| Bug 模式 | `bug-pattern-checklist.md` B/M/I（120 条） | ❌ | P1 / P2 | 预扫 `scan-all-rules.sh` 24 findings：6 条 P0 经复核**全为误报**（`:72`/`:88`/`:118`/`:45`/`:52` 均有日志或已在 `catch` 后 `throw`），仅 `CallerInfoResolver.java:64` 属实（P2-4）；`M016` 时区 17 处属实（P1-3，正例代码 5 处 + 测试 12 处）；`A3.4` `DemoServiceImpl.java:117` 属实（P2-2）。LLM 补扫 B001–B081 / M001–M027 / I001–I010 其余条目：B008 ✅（未用 `Executors`）、B022 ✅（`DateTimeFormatter`）、B076 ✅（无 `@Transactional`）、B080 ✅（34 用例均带断言）、M007 ✅（无空 catch）、M020 ✅（`@Override` 齐全），其余 N/A（详见 checklist §4.1） |

---

## 6. Step 5 — 自定义扩展检查

| 域 | 参考 | 结果 | 等级 | 说明 |
|----|------|------|------|------|
| 自定义扩展 | `customized-checklist.md` U* | ✅ | — | U1.1（Controller 入参统一校验注解）：`DemoController.java:78,90` 的 `@Valid` 已覆盖；`stats`/`export` 走枚举白名单解析 → `BizException`，等效受控。U2 业务红线为空表 → `N/A(未启用自定义规则)` |

---

## 7. 结论

- **合并建议**：**阻止合并**（2 个 P0 直接使核心需求失效）
- **P0**：
  1. **调用人身份不可信且与登录上下文脱节**：`CallerInfoResolver.java:35-39` 直接采信客户端可任意写入的 `X-User-Id`/`X-Person-Type`/`X-Person-Level`/`X-Person-Dept`，无会话、无网关签名校验；任何人可伪造成任意工号/部门，直接篡改报表口径，与 spec §4.5 步骤 2 明确不符（S8.1）。
  2. **多维度报表在真实链路不成立**：前端 `demoController.ts` 全部请求不带身份头，后端也没有登录上下文兜底，导致落库的 `person_type/person_level/person_dept` 恒为「未知」，三个维度聚合结果完全相同，饼图/柱状图只剩一个分类，折线图只剩一条序列——需求「根据不同的维度可视化报表」实际未达成（REQ-4 ❌）。
- **P1**：
  1. 导出明细查询无上限、无分页，`ApiCallRecordMapper.xml:81-86` + `DemoExportServiceImpl.java:79` 把整段区间数据一次性读入内存并逐行 `createRow`，埋点累积后必然 OOM（G4.3）。
  2. 日趋势 SQL 对索引列施加函数：`ApiCallRecordMapper.xml:72,77` `CAST(call_time AS DATE)`，使 `idx_call_time` 与 `idx_api_name_call_time` 失效（G4.2）。
  3. 时区语义未显式声明：`ApiCallRecordServiceImpl.java:59,82`、`DemoExportServiceImpl.java:64,96`、`DemoServiceImpl.java:35,125` 全部依赖 JVM 默认时区，统计「近 7 天」边界与导出时间列会随部署时区漂移（M016 / G14.3 / G14.4）。
  4. 非法 `apiName` 被静默当作「不过滤」：`ApiNameEnum.java:42-49` 返回 null → `DemoController.java:110-112` 三目判断为 null 即全量统计，用户以为筛了 A 接口却拿到全部数据，且与 `DimensionEnum.of()` 抛错语义不一致（G10.1）。
  5. 服务层缺入参防御：`DemoServiceImpl.java:52,69` 对 `request.getInput()`/`request.getNumbers()` 直接解引用，非 Web 入口调用即 NPE（G11.3）。
  6. 参数校验失败（400）不落 `failure` 埋点：`@Valid` 在切面之前拦截，`ApiTrackAspect.java:37-56` 覆盖不到，与 spec §7「接口调用失败 → 埋点记录 `result_status=failure`」不符（REQ-3 ⚠️）。
- **P2**：见 §8 P2 清单（可读性 3 条、静默 catch 1 条、测试边界 1 条、监控/开关 2 条、日志敏感信息 1 条、`format` 参数缺失 1 条、口径「假成功」预警 1 条）。
- **一句话**：`代码结构、SQL 参数化、异步埋点与线程池配置均属良好实践，但「身份来源」这一数据根基没打牢——调用人可伪造、前端又不传，报表等于在真实环境里永远只有「未知」一列；叠加导出无分页与时区漂移，当前状态不具备合并条件。`

---

## 7.1 问题片段（必填）

### P0-1 · `S8.1` · `src/main/java/com/alipay/xchain/demo/track/CallerInfoResolver.java:27-41`

调用人身份全部来自客户端可写请求头，无会话/签名校验；spec §4.5 要求「从当前登录上下文获取调用人信息」。
片段范围：`src/main/java/com/alipay/xchain/demo/track/CallerInfoResolver.java:27-41`

```java
L27|    public CallerInfo resolve() {
L28|        ServletRequestAttributes attributes =
L29|                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
L30|        if (attributes == null) {
L31|            return CallerInfo.anonymous();
L32|        }
L33|        HttpServletRequest request = attributes.getRequest();
L34|        CallerInfo callerInfo = new CallerInfo();
L35|        callerInfo.setCallerId(headerOrDefault(request, DemoConsts.HEADER_USER_ID, DemoConsts.UNKNOWN_CALLER));
L36|        callerInfo.setCallerName(headerOrDefault(request, DemoConsts.HEADER_USER_NAME, DemoConsts.UNKNOWN_CALLER));
L37|        callerInfo.setPersonType(headerOrDefault(request, DemoConsts.HEADER_PERSON_TYPE, DemoConsts.UNKNOWN_LABEL));
L38|        callerInfo.setPersonLevel(headerOrDefault(request, DemoConsts.HEADER_PERSON_LEVEL, DemoConsts.UNKNOWN_LABEL));
L39|        callerInfo.setPersonDept(headerOrDefault(request, DemoConsts.HEADER_PERSON_DEPT, DemoConsts.UNKNOWN_LABEL));
L40|        return callerInfo;
L41|    }
```

### P0-2 · `REQ-4` · 前端 `web/src/services/xchain/demoController.ts:24-48` + 后端 `CallerInfoResolver.java:35-39`

前端所有请求只带 `Content-Type`，从不发送 `X-User-*` 身份头；后端也没有登录上下文兜底，落库维度恒为「未知」，三个维度报表退化。
片段范围：`web/src/services/xchain/demoController.ts:24-27`（前端仓 `manyu_test`，只读核对）

```ts
L24|/** HelloWorld 演示 */
L25|export async function fetchHello(): Promise<DemoResult> {
L26|  const response = await fetch(`${API_BASE}/hello`, { method: 'GET' }); // 问题：未携带任何身份请求头
L27|  return parseResponse<DemoResult>(response);
L28|}
```
片段范围：`src/main/java/com/alipay/xchain/demo/track/CallerInfoResolver.java:35-39`（后端兜底值）

```java
L35|        callerInfo.setCallerId(headerOrDefault(request, DemoConsts.HEADER_USER_ID, DemoConsts.UNKNOWN_CALLER));
L37|        callerInfo.setPersonType(headerOrDefault(request, DemoConsts.HEADER_PERSON_TYPE, DemoConsts.UNKNOWN_LABEL));
L38|        callerInfo.setPersonLevel(headerOrDefault(request, DemoConsts.HEADER_PERSON_LEVEL, DemoConsts.UNKNOWN_LABEL));
L39|        callerInfo.setPersonDept(headerOrDefault(request, DemoConsts.HEADER_PERSON_DEPT, DemoConsts.UNKNOWN_LABEL));
```

### P1-1 · `G4.3` · `src/main/resources/mapper/ApiCallRecordMapper.xml:81-86`

导出明细无 `LIMIT`、无分页，区间内全部记录一次性返回。
片段范围：`src/main/resources/mapper/ApiCallRecordMapper.xml:81-86`、`src/main/java/com/alipay/xchain/demo/service/impl/DemoExportServiceImpl.java:79-81`

```xml
L81|    <select id="selectForExport" resultMap="BaseResultMap">
L82|        SELECT <include refid="Base_Column_List"/>
L83|        FROM api_call_record
L84|        <include refid="Common_Where"/>
L85|        ORDER BY call_time DESC
L86|    </select>
```

```java
L79|                List<ApiCallRecord> records = apiCallRecordMapper.selectForExport(apiName.getCode(),
L80|                        startTime, endTime);
L81|                fillRecordSheet(workbook, headerStyle, apiName, records); // 问题：全量入内存并逐行 createRow
```

### P1-2 · `G4.2` · `src/main/resources/mapper/ApiCallRecordMapper.xml:71-79`

`CAST(call_time AS DATE)` 作用于索引列与 `GROUP BY`，`idx_call_time` 失效。
片段范围：`src/main/resources/mapper/ApiCallRecordMapper.xml:71-79`

```xml
L71|    <select id="trendByDimension" resultMap="StatsTrendMap">
L72|        SELECT CAST(call_time AS DATE) AS stat_date,
L73|               COALESCE(<include refid="Dimension_Column"/>, '未知') AS stat_name,
L74|               COUNT(1) AS call_count
L75|        FROM api_call_record
L76|        <include refid="Common_Where"/>
L77|        GROUP BY CAST(call_time AS DATE), <include refid="Dimension_Column"/>
L78|        ORDER BY CAST(call_time AS DATE) ASC
L79|    </select>
```

### P1-3 · `M016` / `G14.3` / `G14.4` · `ApiCallRecordServiceImpl.java:59,82`、`DemoExportServiceImpl.java:51,64,96`、`DemoServiceImpl.java:35,125`

时区依赖 JVM 默认值，格式化器未绑定 Zone，统计边界与导出时间列随部署环境漂移。
片段范围：`src/main/java/com/alipay/xchain/demo/service/impl/ApiCallRecordServiceImpl.java:82-90`

```java
L82|        LocalDate resolvedEnd = endDate == null ? LocalDate.now() : endDate;   // 问题：JVM 默认时区
L83|        LocalDate resolvedStart = startDate == null
L84|                ? resolvedEnd.minusDays(DemoConsts.DEFAULT_STATS_DAYS - 1L)
L85|                : startDate;
L86|        if (resolvedStart.isAfter(resolvedEnd)) {
L87|            throw new BizException(ErrorCode.PARAM_INVALID, "起始日期不能晚于结束日期");
L88|        }
L89|        LocalDateTime startTime = resolvedStart.atStartOfDay();
L90|        LocalDateTime endTime = resolvedEnd.plusDays(1).atStartOfDay();          // 问题：边界按本地时区切分
```
片段范围：`src/main/java/com/alipay/xchain/demo/service/impl/DemoExportServiceImpl.java:51,95-97`

```java
L51|    private static final DateTimeFormatter CELL_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
L95|    public String buildFileName(String type) {
L96|        return FILE_NAME_PREFIX + type + "-" + LocalDate.now() + "." + DemoConsts.EXPORT_FORMAT_XLSX;
L97|    }   // 问题：Formatter 未 withZone(...)，文件名日期取默认时区
```

### P1-4 · `G10.1` · `src/main/java/com/alipay/xchain/demo/controller/DemoController.java:110-113`

`ApiNameEnum.of()` 非法返回 null，与「不传」不可区分，非法值被静默降级成全量统计。
片段范围：`src/main/java/com/alipay/xchain/demo/controller/DemoController.java:110-113`、`common/enums/ApiNameEnum.java:42-49`

```java
L110|            @RequestParam(value = "apiName", required = false) String apiName) {
L111|        return ApiResponse.ok(apiCallRecordService.queryStats(DimensionEnum.of(dimension), startDate, endDate,
L112|                apiName == null ? null : ApiNameEnum.of(apiName)));   // 问题：非法值 → null → 「不过滤」
L113|    }
```

```java
L42|    public static ApiNameEnum of(String code) {
L43|        for (ApiNameEnum item : values()) {
L44|            if (item.code.equalsIgnoreCase(code)) {
L45|                return item;
L46|            }
L47|        }
L48|        return null;   // 问题：与「未传参」语义混同
L49|    }
```

### P1-5 · `G11.3` · `src/main/java/com/alipay/xchain/demo/service/impl/DemoServiceImpl.java:50-56,67-71`

服务层未对 `input`/`numbers` 做 null 防御，非 Web 入口（RPC/定时/MQ 复用）即 NPE。
片段范围：`src/main/java/com/alipay/xchain/demo/service/impl/DemoServiceImpl.java:50-56`

```java
L50|    public DemoResultVO hash(HashRequest request) {
L51|        HashAlgorithmEnum algorithm = HashAlgorithmEnum.of(request.getAlgorithm());
L52|        String output = digest(algorithm, request.getInput());   // 问题：input 为 null 时 NPE
L53|        if (LOGGER.isDebugEnabled()) {
L54|            LOGGER.debug("哈希计算完成, algorithm: {}, inputLength: {}", algorithm.getCode(),
L55|                    request.getInput().length());
L56|        }
```

### P1-6 · `REQ-3` / `G10` · `src/main/java/com/alipay/xchain/demo/track/ApiTrackAspect.java:37-56`

`@Valid` 校验失败发生在切面之前，400 请求不产生任何埋点，与 spec §7「调用失败记 `result_status=failure`」不符。
片段范围：`src/main/java/com/alipay/xchain/demo/track/ApiTrackAspect.java:37-47`、`controller/DemoController.java:76-80`

```java
L37|    @Around("@annotation(apiTrack)")
L38|    public Object around(ProceedingJoinPoint joinPoint, ApiTrack apiTrack) throws Throwable {
L39|        CallerInfo callerInfo = callerInfoResolver.resolve();
L40|        Object result = null;
L41|        String resultStatus = ResultStatusEnum.SUCCESS.getCode();
L42|        try {
L43|            result = joinPoint.proceed();
L44|            return result;
L45|        } catch (Throwable throwable) {
L46|            resultStatus = ResultStatusEnum.FAILURE.getCode();
L47|            throw throwable;
```

```java
L76|    @ApiTrack(apiName = ApiNameEnum.HASH)
L77|    @PostMapping("/hash")
L78|    public ApiResponse<DemoResultVO> hash(@Valid @RequestBody HashRequest request) {  // 问题：校验失败不进切面
L79|        return ApiResponse.ok(demoService.hash(request));
L80|    }
```

### P2-1 · `A2.4` · `src/main/java/com/alipay/xchain/demo/controller/DemoController.java:3-33`

import 未按 `com < jakarta < java < org` 字典序分组，且 `jakarta.*` 置于最后。
片段范围：`src/main/java/com/alipay/xchain/demo/controller/DemoController.java:3-6,20-33`

```java
L3|import java.net.URLEncoder;
L4|import java.nio.charset.StandardCharsets;
L5|import java.time.LocalDate;
L6|
L7|import org.slf4j.Logger;
...
L20|import com.alipay.xchain.demo.common.ApiResponse;   // 问题：com.* 排在 java.*/org.* 之后
...
L33|import jakarta.validation.Valid;                   // 问题：jakarta.* 应排在 java.* 之前
```

### P2-2 · `A3.4` · `src/main/java/com/alipay/xchain/demo/service/impl/DemoServiceImpl.java:114-121`

单行 123 字符超 120，且内联全限定名 `java.nio.charset.StandardCharsets`。
片段范围：`src/main/java/com/alipay/xchain/demo/service/impl/DemoServiceImpl.java:114-121`

```java
L114|    private String digest(HashAlgorithmEnum algorithm, String input) {
L115|        try {
L116|            MessageDigest messageDigest = MessageDigest.getInstance(algorithm.getDigestAlgorithm());
L117|            return HexFormat.of().formatHex(messageDigest.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
L118|        } catch (NoSuchAlgorithmException e) {
L119|            LOGGER.error("哈希算法不可用, algorithm: {}", algorithm.getCode(), e);
L120|            throw new BizException(ErrorCode.ALGORITHM_NOT_SUPPORTED, "当前 JDK 不支持算法: " + algorithm.getCode());
L121|        }
```

### P2-3 · `A4` · `src/main/java/com/alipay/xchain/demo/common/enums/DimensionEnum.java:28,44-46`、`common/DemoConsts.java:14,36`

`column` 字段与两个常量定义后无任何引用（死代码）。
片段范围：`src/main/java/com/alipay/xchain/demo/common/enums/DimensionEnum.java:24-28,44-46`

```java
L24|    private final String code;
L25|
L26|    private final String description;
L27|
L28|    private final String column;   // 问题：Mapper 用 XML 白名单，该字段从未被读取
...
L44|    public String getColumn() {
L45|        return column;
L46|    }
```

### P2-4 · `G8.1` / `G16.2` · `src/main/java/com/alipay/xchain/demo/track/CallerInfoResolver.java:60-68`

静默 catch，无日志无上下文，线上无法定位请求头解码异常。
片段范围：`src/main/java/com/alipay/xchain/demo/track/CallerInfoResolver.java:60-68`

```java
L60|    static String decodeHeaderValue(String value) {
L61|        if (value.indexOf('%') >= 0) {
L62|            try {
L63|                return URLDecoder.decode(value, StandardCharsets.UTF_8);
L64|            } catch (IllegalArgumentException e) {
L65|                // 非法百分号编码时按原文处理      // 问题：无日志，排障无上下文
L66|                return value;
L67|            }
L68|        }
```

### P2-5 · `G11.2` · `src/test/java/com/alipay/xchain/demo/service/impl/DemoExportServiceImplTest.java:54-113`

测试未覆盖大数据量导出、跨天边界（23:59/00:00）、线程池打满、并发调用等边界。
片段范围：`src/test/java/com/alipay/xchain/demo/service/impl/DemoExportServiceImplTest.java:54-69`

```java
L54|    @Test
L55|    @DisplayName("export: 导出单个 Tab 生成业务页与统计页")
L56|    void should_exportSingleSheetAndStats_when_typeHello() throws Exception {
L57|        byte[] content = demoExportService.export("hello", LocalDate.now(), LocalDate.now());  // 问题：仅 2 条数据
L58|
L59|        assertThat(content).isNotEmpty();
L60|        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(content))) {
L61|            assertThat(workbook.getNumberOfSheets()).isEqualTo(2);
```

### P2-6 · `G16.1` · `src/main/java/com/alipay/xchain/demo/config/TrackExecutorConfig.java:25-36`

埋点链路无指标（写入成功率、队列长度、导出耗时），仅日志可见，无法配置告警。
片段范围：`src/main/java/com/alipay/xchain/demo/config/TrackExecutorConfig.java:25-36`

```java
L25|    @Bean("apiTrackExecutor")
L26|    public Executor apiTrackExecutor() {
L27|        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
L28|        executor.setCorePoolSize(DemoConsts.TRACK_CORE_POOL_SIZE);
L29|        executor.setMaxPoolSize(DemoConsts.TRACK_MAX_POOL_SIZE);
L30|        executor.setQueueCapacity(DemoConsts.TRACK_QUEUE_CAPACITY);   // 问题：队列长度无监控指标
L31|        executor.setThreadNamePrefix(DemoConsts.TRACK_THREAD_NAME_PREFIX);
L32|        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
```

### P2-7 · `G12.2` / `G17.1` / `G17.2` · `src/main/java/com/alipay/xchain/demo/service/impl/DemoExportServiceImpl.java:88-91`

导出/统计异常直接抛 500，无功能开关可实时关闭，也无兜底返回。
片段范围：`src/main/java/com/alipay/xchain/demo/service/impl/DemoExportServiceImpl.java:88-91`

```java
L88|        } catch (IOException e) {
L89|            LOGGER.error("导出文件生成失败, type: {}", type, e);
L90|            throw new BizException(ErrorCode.SYSTEM_ERROR, "导出文件生成失败");   // 问题：无开关、无兜底
L91|        }
```

### P2-8 · `S9.2` · `src/main/java/com/alipay/xchain/demo/track/ApiTrackAspect.java:69-88`

`result_summary` 原样落库哈希原文并随导出带出，若用户输入口令类内容将形成明文扩散。
片段范围：`src/main/java/com/alipay/xchain/demo/track/ApiTrackAspect.java:76-86`

```java
L76|            String type = vo.getType();
L77|            if ("hello".equals(type)) {
L78|                return vo.getMessage();
L79|            }
L80|            if ("hash".equals(type)) {
L81|                return vo.getAlgorithm() + "(" + vo.getInput() + ") = " + vo.getOutput();  // 问题：原文落库
L82|            }
L83|            if ("sort".equals(type)) {
L84|                return "original=" + vo.getOriginal() + " -> sorted=" + vo.getSorted()
L85|                        + ", order=" + vo.getOrder() + ", swapCount=" + vo.getSwapCount();
L86|            }
```

### P2-9 · `REQ-2` · `src/main/java/com/alipay/xchain/demo/controller/DemoController.java:123-129`

spec §4.3 声明 `format` 可选参数，实现未接收；虽默认 xlsx 行为一致，但契约缺项。
片段范围：`src/main/java/com/alipay/xchain/demo/controller/DemoController.java:123-130`

```java
L123|    @GetMapping("/export")
L124|    public ResponseEntity<byte[]> export(
L125|            @RequestParam(value = "type", defaultValue = DemoConsts.EXPORT_TYPE_ALL) String type,
L126|            @RequestParam(value = "startDate", required = false)
L127|            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
L128|            @RequestParam(value = "endDate", required = false)
L129|            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {   // 问题：缺 format 参数
```

---

## 8. 修复任务列表

> 排序：先 P0、再 P1、最后 P2；同级按路径/ID 字母序。

### P0

- [ ] **P0** `src/main/java/com/alipay/xchain/demo/track/CallerInfoResolver.java:27-41` — 改为从登录会话/可信网关上下文（如 `UserContext`/`RpcContext`/验签后的网关注入头）解析调用人，仅当显式开启 `demo.track.mock-caller-enabled` 时才回落到请求头，并把请求头读取路径标记为 demo-only。
- [ ] **P0** 前端 `web/src/services/xchain/demoController.ts:24-48` + 后端 `CallerInfoResolver.java:35-39` — 打通身份透传：前端请求统一注入实际登录用户身份（或由 BFF/网关按会话填充 `X-User-*`），后端提供 `GET /api/demo/current-user` 便于前端校验；补齐一条端到端断言（不同用户 → 三个维度取值不同）。
### P1

- [ ] **P1** `src/main/resources/mapper/ApiCallRecordMapper.xml:81-86` — 为 `selectForExport` 增加 `LIMIT #{limit}`（默认 50000）并支持按 `id > #{lastId}` 游标分批；`DemoExportServiceImpl.java:79-81` 改为分批读取 + SXSSF 流式写，超限时在 Excel 中追加「数据已截断」提示行。
- [ ] **P1** `src/main/resources/mapper/ApiCallRecordMapper.xml:72,77` — 去掉 `CAST(call_time AS DATE)`，改为 `GROUP BY DATE_FORMAT(call_time,'%Y-%m-%d')` 派生列或在表中冗余 `stat_date DATE` 列并建索引（H2 脚本同步）。
- [ ] **P1** `ApiCallRecordServiceImpl.java:59,82`、`DemoExportServiceImpl.java:51,64,96`、`DemoServiceImpl.java:35,125` — 统一时区：新增 `demo.time-zone: Asia/Shanghai` 配置，所有 `now()` 改用 `LocalDateTime.now(ZONE)`/`ZonedDateTime.now(ZONE)`，`DateTimeFormatter` 显式 `.withZone(ZONE)`。
- [ ] **P1** `src/main/java/com/alipay/xchain/demo/common/enums/ApiNameEnum.java:42-49` — 与 `DimensionEnum.of()` 对齐：非法 `apiName` 抛 `BizException(ErrorCode.PARAM_INVALID, …)`，新增 `ApiNameEnum.find()` 保留「返回 null」语义供内部可选场景使用。
- [ ] **P1** `src/main/java/com/alipay/xchain/demo/service/impl/DemoServiceImpl.java:50-56,67-71` — 服务层补 `Objects.requireNonNull`/显式业务异常校验（input 非空且非空白、numbers 非空且不含 null），与 Web 层 `@Valid` 形成二次防御。
- [ ] **P1** `src/main/java/com/alipay/xchain/demo/track/ApiTrackAspect.java:37-56` + `DemoController.java:78,90` — 让参数校验失败也落 `result_status=failure`：把切面切点下移到 Service 层或在 `GlobalExceptionHandler` 中对带 `@ApiTrack` 的请求补记录失败埋点，并补一条 400 场景的埋点断言测试。

### P2（可选）

- [ ] **P2** `src/main/java/com/alipay/xchain/demo/controller/DemoController.java:3-33` — 按 `com < jakarta < java < org` 重排 import 分组；同缺陷一并清理 `CallerInfoResolver.java:3-12`、`HashRequest.java:3-8`、`SortRequest.java:3-8`。
- [ ] **P2** `src/main/java/com/alipay/xchain/demo/service/impl/DemoServiceImpl.java:117` — 上提 `java.nio.charset.StandardCharsets` 为 import，拆行使 ≤120 字符。
- [ ] **P2** `src/main/java/com/alipay/xchain/demo/common/enums/DimensionEnum.java:28,44-46` — 删除未使用的 `column` 字段与 `getColumn()`；同时清理 `DemoConsts.java:14` `MAX_SORT_SIZE`、`:36` `CONTENT_DISPOSITION` 或改为实际引用。
- [ ] **P2** `src/main/java/com/alipay/xchain/demo/track/CallerInfoResolver.java:64-67` — catch 内补 `LOGGER.warn("请求头百分号编码非法, value: {}", value)`，满足空 catch 与可追溯要求。
- [ ] **P2** `src/test/java/com/alipay/xchain/demo/service/impl/DemoExportServiceImplTest.java:54-113` — 补 3 类边界用例：大数据量（>1 万行）导出、跨天边界（23:59:59/00:00:00）、并发调用埋点。
- [ ] **P2** `src/main/java/com/alipay/xchain/demo/config/TrackExecutorConfig.java:25-36` — 为埋点线程池与导出接口补 Micrometer 指标（`track.queue.size`、`track.write.fail.count`、`export.duration`）。
- [ ] **P2** `src/main/java/com/alipay/xchain/demo/service/impl/DemoExportServiceImpl.java:88-91` — 增加功能开关（配置中心）可实时关闭导出，并为失败场景返回可下载的错误说明表而非直接 500。
- [ ] **P2** `src/main/java/com/alipay/xchain/demo/track/ApiTrackAspect.java:81` — `result_summary` 中哈希原文改为脱敏（如仅保留前 4 位 + 长度），或对 `hash` 接口只记录摘要长度与算法。
- [ ] **P2** `src/main/java/com/alipay/xchain/demo/controller/DemoController.java:123-129` — 补 `@RequestParam(value = "format", defaultValue = DemoConsts.EXPORT_FORMAT_XLSX) String format` 并对非 xlsx 值返回 `A0402`，使契约与 spec §4.3 完全一致。
- [ ] **P2** `src/main/java/com/alipay/xchain/demo/service/impl/ApiCallRecordServiceImpl.java:98-110` — 维度聚合结果为空或分类全为「未知」时打 WARN，避免身份未打通导致报表「假成功」静默上线。
