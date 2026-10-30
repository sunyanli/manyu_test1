# demo 模块

## 模块职责

提供接口演示中心的三个演示接口（HelloWorld、哈希算法、冒泡排序），
并对每次调用记录埋点，对外提供多维度调用统计与 Excel 导出能力。

## 关键类

| 类 | 说明 |
|----|------|
| `DemoController` | 演示接口、统计接口、导出接口入口，演示接口标注 `@ApiTrack` 触发埋点 |
| `DemoServiceImpl` | HelloWorld / 哈希 / 冒泡排序实现，冒泡排序返回交换次数 |
| `ApiCallRecordServiceImpl` | 埋点异步落库（失败降级为日志）与多维度统计聚合 |
| `DemoExportServiceImpl` | 基于 Apache POI 生成导出 Excel：各 Tab 明细页 + 调用统计页 |
| `ApiTrackAspect` | 埋点切面，环绕执行、区分 success/failure、提取页面展示结果摘要 |
| `CallerInfoResolver` | 从请求头解析调用人信息，并还原中文编码 |
| `HashAlgorithmEnum` / `SortOrderEnum` / `DimensionEnum` / `ApiNameEnum` | 白名单枚举，杜绝魔法值与 SQL 动态拼接 |

## 依赖关系

- 依赖 `api_call_record` 表（H2 演示库自动建表；生产使用 `schema-mysql.sql`）；
- 依赖 Apache POI 5.2.3 生成 xlsx；
- 埋点写入使用 `apiTrackExecutor` 线程池，队列满时由调用线程兜底执行。

## API 接口列表

| 方法 | 路径 | 入参 | 出参 |
|------|------|------|------|
| GET | `/api/demo/hello` | - | `ApiResponse<DemoResultVO>` |
| POST | `/api/demo/hash` | `{input, algorithm}` | `ApiResponse<DemoResultVO>` |
| POST | `/api/demo/sort` | `{numbers[], order}` | `ApiResponse<DemoResultVO>` |
| GET | `/api/demo/stats` | `dimension, startDate, endDate, apiName` | `ApiResponse<StatsReportVO>` |
| GET | `/api/demo/export` | `type, startDate, endDate` | xlsx 文件流 |

## 错误码

| 错误码 | 场景 |
|--------|------|
| A0400 | 请求参数不合法（含 Bean Validation） |
| A0401 | 哈希算法不支持 |
| A0402 | 导出类型不支持 |
| A0403 | 统计维度不支持 |
| B0001 | 系统内部错误 |
