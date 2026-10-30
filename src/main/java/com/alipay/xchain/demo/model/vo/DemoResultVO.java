package com.alipay.xchain.demo.model.vo;

import java.util.List;

import lombok.Data;

/**
 * 演示接口统一返回对象。
 *
 * @author xchain
 */
@Data
public class DemoResultVO {

    /** 接口类型：hello / hash / sort */
    private String type;

    /** HelloWorld 返回消息 */
    private String message;

    /** 哈希算法名称 */
    private String algorithm;

    /** 哈希原文 */
    private String input;

    /** 哈希结果（十六进制小写） */
    private String output;

    /** 排序前数组 */
    private List<Integer> original;

    /** 排序后数组 */
    private List<Integer> sorted;

    /** 排序顺序 */
    private String order;

    /** 交换次数 */
    private Integer swapCount;

    /** 执行时间戳（ISO8601） */
    private String timestamp;
}
