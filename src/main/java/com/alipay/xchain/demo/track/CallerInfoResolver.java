package com.alipay.xchain.demo.track;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

import com.alipay.xchain.demo.common.DemoConsts;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * 从当前请求上下文解析调用人信息。
 *
 * @author xchain
 */
@Component
public class CallerInfoResolver {

    /**
     * 解析当前请求的调用人信息，无请求上下文时返回默认调用人。
     *
     * @return 调用人信息
     */
    public CallerInfo resolve() {
        ServletRequestAttributes attributes =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            return CallerInfo.anonymous();
        }
        HttpServletRequest request = attributes.getRequest();
        CallerInfo callerInfo = new CallerInfo();
        callerInfo.setCallerId(headerOrDefault(request, DemoConsts.HEADER_USER_ID, DemoConsts.UNKNOWN_CALLER));
        callerInfo.setCallerName(headerOrDefault(request, DemoConsts.HEADER_USER_NAME, DemoConsts.UNKNOWN_CALLER));
        callerInfo.setPersonType(headerOrDefault(request, DemoConsts.HEADER_PERSON_TYPE, DemoConsts.UNKNOWN_LABEL));
        callerInfo.setPersonLevel(headerOrDefault(request, DemoConsts.HEADER_PERSON_LEVEL, DemoConsts.UNKNOWN_LABEL));
        callerInfo.setPersonDept(headerOrDefault(request, DemoConsts.HEADER_PERSON_DEPT, DemoConsts.UNKNOWN_LABEL));
        return callerInfo;
    }

    private String headerOrDefault(HttpServletRequest request, String headerName, String defaultValue) {
        String value = request.getHeader(headerName);
        if (!StringUtils.hasText(value)) {
            return defaultValue;
        }
        return decodeHeaderValue(value.trim());
    }

    /**
     * 还原请求头中的非 ASCII 内容。
     *
     * <p>Servlet 规范中请求头按 ISO-8859-1 解析，中文需要还原为 UTF-8；
     * 同时兼容前端直接传入 URL 编码后的取值。</p>
     *
     * @param value 原始请求头取值
     * @return 还原后的文本
     */
    static String decodeHeaderValue(String value) {
        if (value.indexOf('%') >= 0) {
            try {
                return URLDecoder.decode(value, StandardCharsets.UTF_8);
            } catch (IllegalArgumentException e) {
                // 非法百分号编码时按原文处理
                return value;
            }
        }
        boolean asciiOnly = value.chars().allMatch(codePoint -> codePoint < 0x80);
        if (asciiOnly) {
            return value;
        }
        // 仅当字符全部落在 ISO-8859-1 范围时才可能是「UTF-8 被按 latin1 解析」的乱码
        boolean latin1Range = value.chars().allMatch(codePoint -> codePoint <= 0xFF);
        if (!latin1Range) {
            return value;
        }
        String decoded = new String(value.getBytes(StandardCharsets.ISO_8859_1), StandardCharsets.UTF_8);
        return decoded.indexOf('\uFFFD') >= 0 ? value : decoded;
    }
}
