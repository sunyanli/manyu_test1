package com.alipay.xchain.demo.common;

/**
 * 演示模块常量。
 *
 * @author xchain
 */
public final class DemoConsts {

    /** 哈希入参最大长度 */
    public static final int MAX_HASH_INPUT_LENGTH = 1024;

    /** 排序入参最大元素个数 */
    public static final int MAX_SORT_SIZE = 100;

    /** 统计默认查询天数 */
    public static final int DEFAULT_STATS_DAYS = 7;

    /** 默认哈希算法 */
    public static final String DEFAULT_HASH_ALGORITHM = "SHA-256";

    /** 默认排序顺序 */
    public static final String DEFAULT_SORT_ORDER = "asc";

    /** 导出全部 Tab */
    public static final String EXPORT_TYPE_ALL = "all";

    /** Excel 导出格式 */
    public static final String EXPORT_FORMAT_XLSX = "xlsx";

    /** Excel 内容类型 */
    public static final String XLSX_CONTENT_TYPE =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    /** 文件下载头 */
    public static final String CONTENT_DISPOSITION = "Content-Disposition";

    /** 调用人工号请求头 */
    public static final String HEADER_USER_ID = "X-User-Id";

    /** 调用人姓名请求头 */
    public static final String HEADER_USER_NAME = "X-User-Name";

    /** 人员类型请求头 */
    public static final String HEADER_PERSON_TYPE = "X-Person-Type";

    /** 人员层级请求头 */
    public static final String HEADER_PERSON_LEVEL = "X-Person-Level";

    /** 人员部门请求头 */
    public static final String HEADER_PERSON_DEPT = "X-Person-Dept";

    /** 匿名调用人标识 */
    public static final String UNKNOWN_CALLER = "anonymous";

    /** 未知维度取值 */
    public static final String UNKNOWN_LABEL = "未知";

    /** 响应时间戳格式 */
    public static final String TIMESTAMP_PATTERN = "yyyy-MM-dd'T'HH:mm:ssXXX";

    /** 埋点异步线程池核心线程数 */
    public static final int TRACK_CORE_POOL_SIZE = 2;

    /** 埋点异步线程池最大线程数 */
    public static final int TRACK_MAX_POOL_SIZE = 4;

    /** 埋点异步线程池队列容量 */
    public static final int TRACK_QUEUE_CAPACITY = 1024;

    /** 埋点异步线程池线程名前缀 */
    public static final String TRACK_THREAD_NAME_PREFIX = "api-call-track-";

    private DemoConsts() {
    }
}
