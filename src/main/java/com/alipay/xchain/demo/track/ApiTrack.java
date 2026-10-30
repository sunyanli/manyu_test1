package com.alipay.xchain.demo.track;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import com.alipay.xchain.demo.common.enums.ApiNameEnum;

/**
 * 接口调用埋点标记。
 *
 * <p>标注在 Controller 方法上，由 {@link ApiTrackAspect} 统一记录调用次数与调用人信息。</p>
 *
 * @author xchain
 */
@Documented
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface ApiTrack {

    /**
     * 被埋点的接口。
     *
     * @return 接口枚举
     */
    ApiNameEnum apiName();
}
