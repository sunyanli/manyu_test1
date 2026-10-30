package com.alipay.xchain.demo.common.enums;

/**
 * 埋点结果状态枚举。
 *
 * @author xchain
 */
public enum ResultStatusEnum {

    /** 调用成功 */
    SUCCESS("success"),

    /** 调用失败 */
    FAILURE("failure");

    private final String code;

    ResultStatusEnum(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
