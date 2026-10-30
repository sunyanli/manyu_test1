package com.alipay.xchain.demo.dal.entity;

import java.time.LocalDateTime;

import lombok.Data;

/**
 * 接口调用埋点记录。
 *
 * @author xchain
 */
@Data
public class ApiCallRecord {

    /** 主键 */
    private Long id;

    /** 接口名：hello / hash / sort */
    private String apiName;

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

    /** 调用时间 */
    private LocalDateTime callTime;

    /** 调用结果：success / failure */
    private String resultStatus;

    /** 页面展示结果摘要，用于导出 */
    private String resultSummary;

    /** 记录创建时间 */
    private LocalDateTime gmtCreate;
}
