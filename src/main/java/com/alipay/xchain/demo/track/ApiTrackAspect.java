package com.alipay.xchain.demo.track;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.alipay.xchain.demo.common.ApiResponse;
import com.alipay.xchain.demo.common.enums.ResultStatusEnum;
import com.alipay.xchain.demo.model.vo.DemoResultVO;
import com.alipay.xchain.demo.service.ApiCallRecordService;

/**
 * 接口调用埋点切面。
 *
 * <p>埋点异步落库，任何埋点异常都不影响主流程；结果摘要用于导出页面展示结果。</p>
 *
 * @author xchain
 */
@Aspect
@Component
public class ApiTrackAspect {

    private static final Logger LOGGER = LoggerFactory.getLogger(ApiTrackAspect.class);

    private final ApiCallRecordService apiCallRecordService;

    private final CallerInfoResolver callerInfoResolver;

    public ApiTrackAspect(ApiCallRecordService apiCallRecordService, CallerInfoResolver callerInfoResolver) {
        this.apiCallRecordService = apiCallRecordService;
        this.callerInfoResolver = callerInfoResolver;
    }

    @Around("@annotation(apiTrack)")
    public Object around(ProceedingJoinPoint joinPoint, ApiTrack apiTrack) throws Throwable {
        CallerInfo callerInfo = callerInfoResolver.resolve();
        Object result = null;
        String resultStatus = ResultStatusEnum.SUCCESS.getCode();
        try {
            result = joinPoint.proceed();
            return result;
        } catch (Throwable throwable) {
            resultStatus = ResultStatusEnum.FAILURE.getCode();
            throw throwable;
        } finally {
            try {
                apiCallRecordService.recordAsync(apiTrack.apiName(), callerInfo, resultStatus,
                        ApiTrackSummaryBuilder.build(result));
            } catch (Exception e) {
                LOGGER.error("埋点记录失败, apiName: {}", apiTrack.apiName().getCode(), e);
            }
        }
    }

    /**
     * 从返回值中提取页面展示结果摘要。
     *
     * @param result 接口返回值
     * @return 结果摘要，无法识别时返回 null
     */
    private static final class ApiTrackSummaryBuilder {

        private ApiTrackSummaryBuilder() {
        }

        static String build(Object result) {
            if (!(result instanceof ApiResponse<?> response)) {
                return null;
            }
            if (!(response.getData() instanceof DemoResultVO vo)) {
                return response.isSuccess() ? null : response.getErrorMessage();
            }
            String type = vo.getType();
            if ("hello".equals(type)) {
                return vo.getMessage();
            }
            if ("hash".equals(type)) {
                return vo.getAlgorithm() + "(" + vo.getInput() + ") = " + vo.getOutput();
            }
            if ("sort".equals(type)) {
                return "original=" + vo.getOriginal() + " -> sorted=" + vo.getSorted()
                        + ", order=" + vo.getOrder() + ", swapCount=" + vo.getSwapCount();
            }
            return null;
        }
    }
}
