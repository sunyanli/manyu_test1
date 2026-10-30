package com.alipay.xchain.demo.model.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 按日、按维度分类的调用趋势。
 *
 * @author xchain
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StatsTrendVO {

    /** 日期，格式 yyyy-MM-dd */
    private String date;

    /** 维度分类名称，折线图按该字段分组为多条序列 */
    private String name;

    /** 当日调用次数 */
    private Long callCount;
}
