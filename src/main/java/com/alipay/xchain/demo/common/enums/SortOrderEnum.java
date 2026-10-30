package com.alipay.xchain.demo.common.enums;

import com.alipay.xchain.demo.common.BizException;
import com.alipay.xchain.demo.common.DemoConsts;
import com.alipay.xchain.demo.common.ErrorCode;

/**
 * 排序顺序枚举。
 *
 * @author xchain
 */
public enum SortOrderEnum {

    /** 升序 */
    ASC("asc", "升序"),

    /** 降序 */
    DESC("desc", "降序");

    private final String code;

    private final String description;

    SortOrderEnum(String code, String description) {
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
     * 解析排序顺序，为空时取默认升序。
     *
     * @param code 排序编码
     * @return 排序顺序枚举
     */
    public static SortOrderEnum of(String code) {
        String target = (code == null || code.isBlank()) ? DemoConsts.DEFAULT_SORT_ORDER : code.trim();
        for (SortOrderEnum item : values()) {
            if (item.code.equalsIgnoreCase(target)) {
                return item;
            }
        }
        throw new BizException(ErrorCode.PARAM_INVALID, "不支持的排序顺序: " + target);
    }
}
