package com.alipay.xchain.demo.service.impl;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.alipay.xchain.demo.common.BizException;
import com.alipay.xchain.demo.common.DemoConsts;
import com.alipay.xchain.demo.common.ErrorCode;
import com.alipay.xchain.demo.common.enums.HashAlgorithmEnum;
import com.alipay.xchain.demo.common.enums.SortOrderEnum;
import com.alipay.xchain.demo.model.request.HashRequest;
import com.alipay.xchain.demo.model.request.SortRequest;
import com.alipay.xchain.demo.model.vo.DemoResultVO;
import com.alipay.xchain.demo.service.DemoService;

/**
 * 演示接口业务实现。
 *
 * @author xchain
 */
@Service
public class DemoServiceImpl implements DemoService {

    private static final Logger LOGGER = LoggerFactory.getLogger(DemoServiceImpl.class);

    private static final DateTimeFormatter TIMESTAMP_FORMATTER =
            DateTimeFormatter.ofPattern(DemoConsts.TIMESTAMP_PATTERN);

    private static final String HELLO_MESSAGE = "Hello World! xchain demo接口 v1.0";

    @Override
    public DemoResultVO hello() {
        DemoResultVO result = new DemoResultVO();
        result.setType("hello");
        result.setMessage(HELLO_MESSAGE);
        result.setTimestamp(now());
        return result;
    }

    @Override
    public DemoResultVO hash(HashRequest request) {
        HashAlgorithmEnum algorithm = HashAlgorithmEnum.of(request.getAlgorithm());
        String output = digest(algorithm, request.getInput());
        if (LOGGER.isDebugEnabled()) {
            LOGGER.debug("哈希计算完成, algorithm: {}, inputLength: {}", algorithm.getCode(),
                    request.getInput().length());
        }
        DemoResultVO result = new DemoResultVO();
        result.setType("hash");
        result.setAlgorithm(algorithm.getCode());
        result.setInput(request.getInput());
        result.setOutput(output);
        result.setTimestamp(now());
        return result;
    }

    @Override
    public DemoResultVO sort(SortRequest request) {
        SortOrderEnum order = SortOrderEnum.of(request.getOrder());
        List<Integer> original = new ArrayList<>(request.getNumbers());
        List<Integer> sorted = new ArrayList<>(original);
        int swapCount = bubbleSort(sorted, order);
        DemoResultVO result = new DemoResultVO();
        result.setType("sort");
        result.setOriginal(original);
        result.setSorted(sorted);
        result.setOrder(order.getCode());
        result.setSwapCount(swapCount);
        result.setTimestamp(now());
        return result;
    }

    /**
     * 冒泡排序，原地排序并返回交换次数。
     *
     * @param numbers 待排序数组
     * @param order   排序顺序
     * @return 交换次数
     */
    private int bubbleSort(List<Integer> numbers, SortOrderEnum order) {
        int size = numbers.size();
        int swapCount = 0;
        boolean asc = SortOrderEnum.ASC == order;
        for (int i = 0; i < size - 1; i++) {
            boolean swapped = false;
            for (int j = 0; j < size - i - 1; j++) {
                boolean needSwap = asc
                        ? numbers.get(j) > numbers.get(j + 1)
                        : numbers.get(j) < numbers.get(j + 1);
                if (needSwap) {
                    Integer temp = numbers.get(j);
                    numbers.set(j, numbers.get(j + 1));
                    numbers.set(j + 1, temp);
                    swapCount++;
                    swapped = true;
                }
            }
            if (!swapped) {
                break;
            }
        }
        return swapCount;
    }

    private String digest(HashAlgorithmEnum algorithm, String input) {
        try {
            MessageDigest messageDigest = MessageDigest.getInstance(algorithm.getDigestAlgorithm());
            return HexFormat.of().formatHex(messageDigest.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            LOGGER.error("哈希算法不可用, algorithm: {}", algorithm.getCode(), e);
            throw new BizException(ErrorCode.ALGORITHM_NOT_SUPPORTED, "当前 JDK 不支持算法: " + algorithm.getCode());
        }
    }

    private String now() {
        return ZonedDateTime.now().format(TIMESTAMP_FORMATTER);
    }
}
