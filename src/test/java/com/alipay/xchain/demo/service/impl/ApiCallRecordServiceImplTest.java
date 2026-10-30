package com.alipay.xchain.demo.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import com.alipay.xchain.demo.common.BizException;
import com.alipay.xchain.demo.common.enums.ApiNameEnum;
import com.alipay.xchain.demo.common.enums.DimensionEnum;
import com.alipay.xchain.demo.common.enums.ResultStatusEnum;
import com.alipay.xchain.demo.model.vo.StatsReportVO;
import com.alipay.xchain.demo.service.ApiCallRecordService;
import com.alipay.xchain.demo.track.CallerInfo;

/**
 * {@link ApiCallRecordServiceImpl} 集成测试（H2 内存库）。
 *
 * @author xchain
 */
@SpringBootTest
class ApiCallRecordServiceImplTest {

    @Autowired
    private ApiCallRecordService apiCallRecordService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanTable() {
        jdbcTemplate.update("DELETE FROM api_call_record");
    }

    private CallerInfo caller(String id, String name, String type, String level, String dept) {
        return new CallerInfo(id, name, type, level, dept);
    }

    @Test
    @DisplayName("record: 写入埋点后按人员类型聚合")
    void should_aggregateByPersonType_when_recordCalled() {
        apiCallRecordService.record(ApiNameEnum.HELLO, caller("1001", "张三", "研发工程师", "P6", "技术部"),
                ResultStatusEnum.SUCCESS.getCode(), "Hello World");
        apiCallRecordService.record(ApiNameEnum.HASH, caller("1001", "张三", "研发工程师", "P6", "技术部"),
                ResultStatusEnum.SUCCESS.getCode(), "SHA-256(abc) = ba78");
        apiCallRecordService.record(ApiNameEnum.SORT, caller("1002", "李四", "测试工程师", "P5", "质量部"),
                ResultStatusEnum.SUCCESS.getCode(), "sorted=[1, 2]");

        StatsReportVO report = apiCallRecordService.queryStats(DimensionEnum.PERSON_TYPE,
                LocalDate.now(), LocalDate.now(), null);

        assertThat(report.getTotalCount()).isEqualTo(3L);
        assertThat(report.getDimension()).isEqualTo("personType");
        assertThat(report.getItems()).hasSize(2);
        assertThat(report.getItems().get(0).getName()).isEqualTo("研发工程师");
        assertThat(report.getItems().get(0).getCallCount()).isEqualTo(2L);
        assertThat(report.getTrend()).isNotEmpty();
        assertThat(report.getTrend().get(0).getDate()).isEqualTo(LocalDate.now().toString());
    }

    @Test
    @DisplayName("record: 按部门维度与接口过滤聚合")
    void should_aggregateByDeptAndApiFilter_when_filterProvided() {
        apiCallRecordService.record(ApiNameEnum.HASH, caller("1001", "张三", "研发工程师", "P6", "技术部"),
                ResultStatusEnum.SUCCESS.getCode(), "h1");
        apiCallRecordService.record(ApiNameEnum.SORT, caller("1002", "李四", "测试工程师", "P5", "质量部"),
                ResultStatusEnum.FAILURE.getCode(), "参数错误");

        StatsReportVO allDept = apiCallRecordService.queryStats(DimensionEnum.PERSON_DEPT,
                LocalDate.now(), LocalDate.now(), null);
        assertThat(allDept.getItems()).hasSize(2);
        assertThat(allDept.getTotalCount()).isEqualTo(2L);

        StatsReportVO hashOnly = apiCallRecordService.queryStats(DimensionEnum.PERSON_DEPT,
                LocalDate.now(), LocalDate.now(), ApiNameEnum.HASH);
        assertThat(hashOnly.getTotalCount()).isEqualTo(1L);
        assertThat(hashOnly.getItems()).hasSize(1);
        assertThat(hashOnly.getItems().get(0).getName()).isEqualTo("技术部");
    }

    @Test
    @DisplayName("queryStats: 默认区间为近 7 天")
    void should_useDefaultRange_when_dateAbsent() {
        StatsReportVO report = apiCallRecordService.queryStats(DimensionEnum.PERSON_LEVEL, null, null, null);

        assertThat(report.getEndDate()).isEqualTo(LocalDate.now().toString());
        assertThat(report.getStartDate()).isEqualTo(LocalDate.now().minusDays(6).toString());
        assertThat(report.getItems()).isEmpty();
    }

    @Test
    @DisplayName("queryStats: 起始日期晚于结束日期抛出参数异常")
    void should_throwBizException_when_startAfterEnd() {
        assertThatThrownBy(() -> apiCallRecordService.queryStats(DimensionEnum.PERSON_TYPE,
                LocalDate.now(), LocalDate.now().minusDays(1), null))
                .isInstanceOf(BizException.class)
                .hasMessageContaining("起始日期");
    }

    @Test
    @DisplayName("record: 结果摘要超长时截断，空摘要可写入")
    void should_truncateSummary_when_summaryTooLong() {
        String longSummary = "x".repeat(800);
        apiCallRecordService.record(ApiNameEnum.HASH, caller("1001", "张三", "研发工程师", "P6", "技术部"),
                ResultStatusEnum.SUCCESS.getCode(), longSummary);
        apiCallRecordService.record(ApiNameEnum.HELLO, CallerInfo.anonymous(),
                ResultStatusEnum.SUCCESS.getCode(), null);

        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(1) FROM api_call_record", Integer.class);
        assertThat(count).isEqualTo(2);
        Integer maxLength = jdbcTemplate.queryForObject(
                "SELECT MAX(LENGTH(result_summary)) FROM api_call_record", Integer.class);
        assertThat(maxLength).isEqualTo(500);
    }
}
