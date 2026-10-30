package com.alipay.xchain.demo.model.request;

import com.alipay.xchain.demo.common.DemoConsts;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 哈希算法请求体。
 *
 * @author xchain
 */
@Data
public class HashRequest {

    /** 待计算哈希的原文 */
    @NotBlank(message = "输入内容不能为空")
    @Size(max = DemoConsts.MAX_HASH_INPUT_LENGTH, message = "输入内容长度不能超过 1024 个字符")
    private String input;

    /** 哈希算法，默认 SHA-256，可选 MD5 / SHA-1 / SHA-256 */
    private String algorithm;
}
