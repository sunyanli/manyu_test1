package com.alipay.xchain.demo.service.impl;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import com.alipay.xchain.demo.common.BizException;
import com.alipay.xchain.demo.common.DemoConsts;
import com.alipay.xchain.demo.common.ErrorCode;
import com.alipay.xchain.demo.common.enums.ApiNameEnum;
import com.alipay.xchain.demo.common.enums.DimensionEnum;
import com.alipay.xchain.demo.dal.entity.ApiCallRecord;
import com.alipay.xchain.demo.dal.mapper.ApiCallRecordMapper;
import com.alipay.xchain.demo.model.vo.StatsItemVO;
import com.alipay.xchain.demo.model.vo.StatsReportVO;
import com.alipay.xchain.demo.model.vo.StatsTrendVO;
import com.alipay.xchain.demo.service.ApiCallRecordService;
import com.alipay.xchain.demo.track.CallerInfo;

/**
 * 接口调用埋点与统计服务实现。
 *
 * @author xchain
 */
@Service
public class ApiCallRecordServiceImpl implements ApiCallRecordService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ApiCallRecordServiceImpl.class);

    /** 结果摘要最大长度，与 api_call_record.result_summary 列宽对齐 */
    private static final int MAX_SUMMARY_LENGTH = 500;

    private final ApiCallRecordMapper apiCallRecordMapper;

    private final Executor apiTrackExecutor;

    public ApiCallRecordServiceImpl(ApiCallRecordMapper apiCallRecordMapper,
                                    @Qualifier("apiTrackExecutor") Executor apiTrackExecutor) {
        this.apiCallRecordMapper = apiCallRecordMapper;
        this.apiTrackExecutor = apiTrackExecutor;
    }

    @Override
    public void recordAsync(ApiNameEnum apiName, CallerInfo callerInfo, String resultStatus,
                            String resultSummary) {
        apiTrackExecutor.execute(() -> record(apiName, callerInfo, resultStatus, resultSummary));
    }

    @Override
    public void record(ApiNameEnum apiName, CallerInfo callerInfo, String resultStatus, String resultSummary) {
        try {
            LocalDateTime now = LocalDateTime.now();
            ApiCallRecord record = new ApiCallRecord();
            record.setApiName(apiName.getCode());
            record.setCallerId(callerInfo.getCallerId());
            record.setCallerName(callerInfo.getCallerName());
            record.setPersonType(callerInfo.getPersonType());
            record.setPersonLevel(callerInfo.getPersonLevel());
            record.setPersonDept(callerInfo.getPersonDept());
            record.setCallTime(now);
            record.setResultStatus(resultStatus);
            record.setResultSummary(truncate(resultSummary));
            record.setGmtCreate(now);
            apiCallRecordMapper.insert(record);
        } catch (Exception e) {
            // 埋点失败降级为日志，不影响主流程
            LOGGER.error("埋点落库失败, apiName: {}, callerId: {}", apiName.getCode(),
                    callerInfo.getCallerId(), e);
        }
    }

    @Override
    public StatsReportVO queryStats(DimensionEnum dimension, LocalDate startDate, LocalDate endDate,
                                    ApiNameEnum apiName) {
        LocalDate resolvedEnd = endDate == null ? LocalDate.now() : endDate;
        LocalDate resolvedStart = startDate == null
                ? resolvedEnd.minusDays(DemoConsts.DEFAULT_STATS_DAYS - 1L)
                : startDate;
        if (resolvedStart.isAfter(resolvedEnd)) {
            throw new BizException(ErrorCode.PARAM_INVALID, "起始日期不能晚于结束日期");
        }
        LocalDateTime startTime = resolvedStart.atStartOfDay();
        LocalDateTime endTime = resolvedEnd.plusDays(1).atStartOfDay();
        String apiNameCode = apiName == null ? null : apiName.getCode();

        List<StatsItemVO> items = apiCallRecordMapper.countByDimension(dimension.getCode(), apiNameCode,
                startTime, endTime);
        List<StatsTrendVO> trend = apiCallRecordMapper.trendByDimension(dimension.getCode(), apiNameCode,
                startTime, endTime);

        long totalCount = 0L;
        for (StatsItemVO item : items) {
            totalCount += item.getCallCount() == null ? 0L : item.getCallCount();
        }
        StatsReportVO report = new StatsReportVO();
        report.setDimension(dimension.getCode());
        report.setDimensionName(dimension.getDescription());
        report.setStartDate(resolvedStart.toString());
        report.setEndDate(resolvedEnd.toString());
        report.setTotalCount(totalCount);
        report.setItems(items == null ? new ArrayList<>() : items);
        report.setTrend(trend == null ? new ArrayList<>() : trend);
        return report;
    }

    private String truncate(String summary) {
        if (summary == null) {
            return null;
        }
        return summary.length() <= MAX_SUMMARY_LENGTH ? summary : summary.substring(0, MAX_SUMMARY_LENGTH);
    }
}
