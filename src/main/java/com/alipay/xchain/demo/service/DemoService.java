package com.alipay.xchain.demo.service;

import com.alipay.xchain.demo.model.request.HashRequest;
import com.alipay.xchain.demo.model.request.SortRequest;
import com.alipay.xchain.demo.model.vo.DemoResultVO;

/**
 * 演示接口业务服务。
 *
 * @author xchain
 */
public interface DemoService {

    /**
     * HelloWorld 演示。
     *
     * @return 演示结果
     */
    DemoResultVO hello();

    /**
     * 计算字符串哈希。
     *
     * @param request 哈希请求
     * @return 演示结果
     */
    DemoResultVO hash(HashRequest request);

    /**
     * 冒泡排序。
     *
     * @param request 排序请求
     * @return 演示结果
     */
    DemoResultVO sort(SortRequest request);
}
