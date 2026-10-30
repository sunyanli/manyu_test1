package com.alipay.xchain.demo.common.enums;

import com.alipay.xchain.demo.common.BizException;
import com.alipay.xchain.demo.common.ErrorCode;

/**
 * 调用统计维度枚举。
 *
 * <p>对外编码 camelCase，MySQL 列名固定为白名单值，避免动态 SQL 拼接。</p>
 *
 * @author xchain
 */
public enum DimensionEnum {

    /** 人员类型 */
    PERSON_TYPE("personType", "人员类型", "person_type"),

    /** 人员层级 */
    PERSON_LEVEL("personLevel", "人员层级", "person_level"),

    /** 人员部门 */
    PERSON_DEPT("personDept", "人员部门", "person_dept");

    private final String code;

    private final String description;

    private final String column;

    DimensionEnum(String code, String description, String column) {
        this.code = code;
        this.description = description;
        this.column = column;
    }

    public String getCode() {
        return code;
    }

    public String getDescription() {
        return description;
    }

    public String getColumn() {
        return column;
    }

    /**
     * 解析统计维度编码。
     *
     * @param code 维度编码
     * @return 统计维度枚举
     */
    public static DimensionEnum of(String code) {
        for (DimensionEnum item : values()) {
            if (item.code.equalsIgnoreCase(code)) {
                return item;
            }
        }
        throw new BizException(ErrorCode.DIMENSION_NOT_SUPPORTED, "不支持的统计维度: " + code);
    }
}
