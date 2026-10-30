package com.alipay.xchain.demo.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.alipay.xchain.demo.common.BizException;
import com.alipay.xchain.demo.common.ErrorCode;
import com.alipay.xchain.demo.model.request.HashRequest;
import com.alipay.xchain.demo.model.request.SortRequest;
import com.alipay.xchain.demo.model.vo.DemoResultVO;

/**
 * {@link DemoServiceImpl} 单元测试。
 *
 * @author xchain
 */
class DemoServiceImplTest {

    private DemoServiceImpl demoService;

    @BeforeEach
    void setUp() {
        demoService = new DemoServiceImpl();
    }

    @Test
    @DisplayName("hello: 返回固定消息与可解析时间戳")
    void should_returnHelloResult_when_callHello() {
        DemoResultVO result = demoService.hello();

        assertThat(result.getType()).isEqualTo("hello");
        assertThat(result.getMessage()).contains("Hello World");
        assertThat(result.getTimestamp()).isNotBlank();
    }

    @Test
    @DisplayName("hash: 默认算法为 SHA-256 且结果与 JDK 摘要一致")
    void should_returnSha256Digest_when_algorithmAbsent() {
        HashRequest request = new HashRequest();
        request.setInput("abc");

        DemoResultVO result = demoService.hash(request);

        assertThat(result.getType()).isEqualTo("hash");
        assertThat(result.getAlgorithm()).isEqualTo("SHA-256");
        assertThat(result.getOutput()).isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }

    @Test
    @DisplayName("hash: 指定 MD5 时返回 32 位摘要")
    void should_returnMd5Digest_when_algorithmMd5() {
        HashRequest request = new HashRequest();
        request.setInput("abc");
        request.setAlgorithm("MD5");

        DemoResultVO result = demoService.hash(request);

        assertThat(result.getAlgorithm()).isEqualTo("MD5");
        assertThat(result.getOutput()).isEqualTo("900150983cd24fb0d6963f7d28e17f72");
    }

    @Test
    @DisplayName("hash: 不支持的算法抛出算法不支持异常")
    void should_throwBizException_when_algorithmUnsupported() {
        HashRequest request = new HashRequest();
        request.setInput("abc");
        request.setAlgorithm("SHA-512");

        assertThatThrownBy(() -> demoService.hash(request))
                .isInstanceOf(BizException.class)
                .extracting(e -> ((BizException) e).getErrorCode())
                .isEqualTo(ErrorCode.ALGORITHM_NOT_SUPPORTED);
    }

    @Test
    @DisplayName("sort: 升序排序结果正确且交换次数为 8")
    void should_returnAscSortedArray_when_orderAsc() {
        SortRequest request = new SortRequest();
        request.setNumbers(new ArrayList<>(Arrays.asList(5, 3, 8, 1, 9, 2)));
        request.setOrder("asc");

        DemoResultVO result = demoService.sort(request);

        assertThat(result.getOriginal()).containsExactly(5, 3, 8, 1, 9, 2);
        assertThat(result.getSorted()).containsExactly(1, 2, 3, 5, 8, 9);
        assertThat(result.getOrder()).isEqualTo("asc");
        assertThat(result.getSwapCount()).isEqualTo(8);
    }

    @Test
    @DisplayName("sort: 降序排序结果正确")
    void should_returnDescSortedArray_when_orderDesc() {
        SortRequest request = new SortRequest();
        request.setNumbers(new ArrayList<>(Arrays.asList(5, 3, 8, 1, 9, 2)));
        request.setOrder("desc");

        DemoResultVO result = demoService.sort(request);

        assertThat(result.getSorted()).containsExactly(9, 8, 5, 3, 2, 1);
        assertThat(result.getOrder()).isEqualTo("desc");
    }

    @Test
    @DisplayName("sort: 已排序数组交换次数为 0")
    void should_returnZeroSwap_when_arrayAlreadySorted() {
        SortRequest request = new SortRequest();
        request.setNumbers(new ArrayList<>(Arrays.asList(1, 2, 3)));

        DemoResultVO result = demoService.sort(request);

        assertThat(result.getSorted()).containsExactly(1, 2, 3);
        assertThat(result.getSwapCount()).isZero();
    }

    @Test
    @DisplayName("sort: 单元素与空数组边界场景")
    void should_returnSameArray_when_singleOrEmpty() {
        SortRequest single = new SortRequest();
        single.setNumbers(new ArrayList<>(Collections.singletonList(42)));
        assertThat(demoService.sort(single).getSorted()).containsExactly(42);
        assertThat(demoService.sort(single).getSwapCount()).isZero();

        SortRequest empty = new SortRequest();
        empty.setNumbers(new ArrayList<>());
        List<Integer> sorted = demoService.sort(empty).getSorted();
        assertThat(sorted).isEmpty();
    }

    @Test
    @DisplayName("sort: 非法排序顺序抛出参数异常")
    void should_throwBizException_when_orderInvalid() {
        SortRequest request = new SortRequest();
        request.setNumbers(new ArrayList<>(Arrays.asList(1, 2)));
        request.setOrder("up");

        assertThatThrownBy(() -> demoService.sort(request))
                .isInstanceOf(BizException.class)
                .extracting(e -> ((BizException) e).getErrorCode())
                .isEqualTo(ErrorCode.PARAM_INVALID);
    }
}
