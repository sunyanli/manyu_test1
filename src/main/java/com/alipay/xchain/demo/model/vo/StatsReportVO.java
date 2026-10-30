package com.alipay.xchain.demo.model.vo;

import java.util.List;

import lombok.Data;

/**
 * 调用统计报表。
 *
 * @author xchain
 */
@Data
public class StatsReportVO {

    /** 统计维度编码：personType / personLevel / personDept */
    private String dimension;

    /** 统计维度名称 */
    private String dimensionName;

    /** 起始日期 yyyy-MM-dd */
    private String startDate;

    /** 结束日期 yyyy-MM-dd */
    private String endDate;

    /** 区间内总调用次数 */
    private Long totalCount;

    /** 维度分类聚合数据（饼图、柱状图数据源） */
    private List<StatsItemVO> items;

    /** 每日趋势数据（折线图数据源） */
    private List<StatsTrendVO> trend;
}
