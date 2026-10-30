package com.alipay.xchain.demo.service;

import java.time.LocalDate;

import com.alipay.xchain.demo.common.enums.ApiNameEnum;
import com.alipay.xchain.demo.common.enums.DimensionEnum;
import com.alipay.xchain.demo.model.vo.StatsReportVO;
import com.alipay.xchain.demo.track.CallerInfo;

/**
 * 接口调用埋点与统计服务。
 *
 * @author xchain
 */
public interface ApiCallRecordService {

    /**
     * 异步记录一次接口调用。
     *
     * @param apiName      接口枚举
     * @param callerInfo   调用人信息
     * @param resultStatus 调用结果
     * @param resultSummary 页面展示结果摘要
     */
    void recordAsync(ApiNameEnum apiName, CallerInfo callerInfo, String resultStatus, String resultSummary);

    /**
     * 同步记录一次接口调用，主要供测试与降级场景使用。
     *
     * @param apiName       接口枚举
     * @param callerInfo    调用人信息
     * @param resultStatus  调用结果
     * @param resultSummary 页面展示结果摘要
     */
    void record(ApiNameEnum apiName, CallerInfo callerInfo, String resultStatus, String resultSummary);

    /**
     * 按维度查询调用统计报表。
     *
     * @param dimension 统计维度
     * @param startDate 起始日期（含），为 null 时默认近 7 天
     * @param endDate   结束日期（含），为 null 时默认当天
     * @param apiName   接口枚举，为 null 时不限接口
     * @return 统计报表
     */
    StatsReportVO queryStats(DimensionEnum dimension, LocalDate startDate, LocalDate endDate, ApiNameEnum apiName);
}
