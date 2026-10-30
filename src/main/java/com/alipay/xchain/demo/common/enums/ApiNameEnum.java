package com.alipay.xchain.demo.common.enums;

/**
 * 被埋点的演示接口枚举。
 *
 * @author xchain
 */
public enum ApiNameEnum {

    /** HelloWorld 接口 */
    HELLO("hello", "HelloWorld 接口"),

    /** 哈希算法接口 */
    HASH("hash", "哈希算法接口"),

    /** 冒泡排序接口 */
    SORT("sort", "冒泡排序接口");

    private final String code;

    private final String description;

    ApiNameEnum(String code, String description) {
        this.code = code;
        this.description = description;
    }

    public String getCode() {
        return code;
    }

    public String getDescription() {
        return description;
    }

    /**
     * 按接口编码匹配枚举，匹配失败返回 null。
     *
     * @param code 接口编码
     * @return 匹配到的枚举，未匹配返回 null
     */
    public static ApiNameEnum of(String code) {
        for (ApiNameEnum item : values()) {
            if (item.code.equalsIgnoreCase(code)) {
                return item;
            }
        }
        return null;
    }
}
