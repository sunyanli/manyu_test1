package com.alipay.xchain.demo.track;

import com.alipay.xchain.demo.common.DemoConsts;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 调用人信息。
 *
 * <p>生产环境由登录会话/组织架构接口提供，演示环境通过请求头透传。</p>
 *
 * @author xchain
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CallerInfo {

    /** 调用人工号 */
    private String callerId;

    /** 调用人姓名 */
    private String callerName;

    /** 人员类型 */
    private String personType;

    /** 人员层级 */
    private String personLevel;

    /** 人员部门 */
    private String personDept;

    /**
     * 兜底默认调用人，避免埋点写入空值。
     *
     * @return 默认调用人信息
     */
    public static CallerInfo anonymous() {
        return new CallerInfo(DemoConsts.UNKNOWN_CALLER, DemoConsts.UNKNOWN_CALLER,
                DemoConsts.UNKNOWN_LABEL, DemoConsts.UNKNOWN_LABEL, DemoConsts.UNKNOWN_LABEL);
    }
}
