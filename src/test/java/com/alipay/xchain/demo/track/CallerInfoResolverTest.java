package com.alipay.xchain.demo.track;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * {@link CallerInfoResolver} 请求头解码测试。
 *
 * @author xchain
 */
class CallerInfoResolverTest {

    @Test
    @DisplayName("ASCII 取值原样返回")
    void should_returnSameValue_when_asciiOnly() {
        assertThat(CallerInfoResolver.decodeHeaderValue("1001")).isEqualTo("1001");
    }

    @Test
    @DisplayName("ISO-8859-1 解析的 UTF-8 中文可还原")
    void should_restoreChinese_when_headerDecodedAsLatin1() {
        String original = "研发工程师";
        String latin1Misread = new String(original.getBytes(StandardCharsets.UTF_8),
                StandardCharsets.ISO_8859_1);

        assertThat(CallerInfoResolver.decodeHeaderValue(latin1Misread)).isEqualTo(original);
    }

    @Test
    @DisplayName("URL 编码的中文可解码")
    void should_decodeUrlEncoded_when_headerUrlEncoded() {
        assertThat(CallerInfoResolver.decodeHeaderValue("%E6%8A%80%E6%9C%AF%E9%83%A8")).isEqualTo("技术部");
    }

    @Test
    @DisplayName("已是正确中文时不重复解码")
    void should_keepValue_when_alreadyUnicode() {
        assertThat(CallerInfoResolver.decodeHeaderValue("技术部")).isEqualTo("技术部");
    }

    @Test
    @DisplayName("真正的 Latin-1 文本不被破坏")
    void should_keepValue_when_genuineLatin1() {
        assertThat(CallerInfoResolver.decodeHeaderValue("Müller")).isEqualTo("Müller");
    }

    @Test
    @DisplayName("非法百分号编码按原文返回")
    void should_returnRaw_when_percentInvalid() {
        assertThat(CallerInfoResolver.decodeHeaderValue("100%")).isEqualTo("100%");
    }
}
