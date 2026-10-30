package com.alipay.xchain.demo.common.enums;

import com.alipay.xchain.demo.common.BizException;
import com.alipay.xchain.demo.common.DemoConsts;
import com.alipay.xchain.demo.common.ErrorCode;

/**
 * 哈希算法枚举。
 *
 * @author xchain
 */
public enum HashAlgorithmEnum {

    /** MD5 */
    MD5("MD5", "MD5"),

    /** SHA-1 */
    SHA1("SHA-1", "SHA-1"),

    /** SHA-256 */
    SHA256("SHA-256", "SHA-256");

    private final String code;

    private final String digestAlgorithm;

    HashAlgorithmEnum(String code, String digestAlgorithm) {
        this.code = code;
        this.digestAlgorithm = digestAlgorithm;
    }

    public String getCode() {
        return code;
    }

    public String getDigestAlgorithm() {
        return digestAlgorithm;
    }

    /**
     * 解析算法编码，为空时取默认算法（SHA-256）。
     *
     * @param code 算法编码
     * @return 哈希算法枚举
     */
    public static HashAlgorithmEnum of(String code) {
        String target = (code == null || code.isBlank()) ? DemoConsts.DEFAULT_HASH_ALGORITHM : code.trim();
        for (HashAlgorithmEnum item : values()) {
            if (item.code.equalsIgnoreCase(target)) {
                return item;
            }
        }
        throw new BizException(ErrorCode.ALGORITHM_NOT_SUPPORTED, "不支持的哈希算法: " + target);
    }
}
