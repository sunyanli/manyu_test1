package com.alipay.xchain.demo.dal.mapper;

import java.time.LocalDateTime;
import java.util.List;

import org.apache.ibatis.annotations.Param;

import com.alipay.xchain.demo.dal.entity.ApiCallRecord;
import com.alipay.xchain.demo.model.vo.StatsItemVO;
import com.alipay.xchain.demo.model.vo.StatsTrendVO;

/**
 * 接口调用埋点数据访问。
 *
 * @author xchain
 */
public interface ApiCallRecordMapper {

    /**
     * 新增埋点记录。
     *
     * @param record 埋点记录
     * @return 影响行数
     */
    int insert(ApiCallRecord record);

    /**
     * 按维度聚合调用次数。
     *
     * @param dimensionCode 维度编码（白名单枚举编码）
     * @param apiName       接口名，为 null 时不限接口
     * @param startTime     起始时间（含）
     * @param endTime       结束时间（不含）
     * @return 维度分类调用次数列表
     */
    List<StatsItemVO> countByDimension(@Param("dimensionCode") String dimensionCode,
                                       @Param("apiName") String apiName,
                                       @Param("startTime") LocalDateTime startTime,
                                       @Param("endTime") LocalDateTime endTime);

    /**
     * 按日期与维度分类统计调用次数。
     *
     * @param dimensionCode 维度编码（白名单枚举编码）
     * @param apiName       接口名，为 null 时不限接口
     * @param startTime     起始时间（含）
     * @param endTime       结束时间（不含）
     * @return 每日趋势列表
     */
    List<StatsTrendVO> trendByDimension(@Param("dimensionCode") String dimensionCode,
                                        @Param("apiName") String apiName,
                                        @Param("startTime") LocalDateTime startTime,
                                        @Param("endTime") LocalDateTime endTime);

    /**
     * 按接口查询调用明细，用于导出。
     *
     * @param apiName   接口名，为 null 时不限接口
     * @param startTime 起始时间（含）
     * @param endTime   结束时间（不含）
     * @return 调用明细列表
     */
    List<ApiCallRecord> selectForExport(@Param("apiName") String apiName,
                                        @Param("startTime") LocalDateTime startTime,
                                        @Param("endTime") LocalDateTime endTime);
}
