package com.alipay.xchain.demo.common;

/**
 * 错误码枚举。
 *
 * <p>错误码格式：来源标识（A 用户端 / B 当前系统 / C 第三方）+ 四位数字编号。</p>
 *
 * @author xchain
 */
public enum ErrorCode {

    /** 请求参数不合法 */
    PARAM_INVALID("A0400", "请求参数不正确", "请检查输入内容后重试"),

    /** 哈希算法不支持 */
    ALGORITHM_NOT_SUPPORTED("A0401", "哈希算法不支持", "请选择 MD5、SHA-1 或 SHA-256"),

    /** 导出类型不支持 */
    EXPORT_TYPE_NOT_SUPPORTED("A0402", "导出类型不支持", "请选择 hello、hash、sort 或 all"),

    /** 统计维度不支持 */
    DIMENSION_NOT_SUPPORTED("A0403", "统计维度不支持", "请选择人员类型、人员层级或人员部门"),

    /** 系统内部错误 */
    SYSTEM_ERROR("B0001", "系统执行出错", "系统开小差了，请稍后重试");

    private final String code;

    private final String message;

    private final String userTip;

    ErrorCode(String code, String message, String userTip) {
        this.code = code;
        this.message = message;
        this.userTip = userTip;
    }

    public String getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }

    public String getUserTip() {
        return userTip;
    }
}
