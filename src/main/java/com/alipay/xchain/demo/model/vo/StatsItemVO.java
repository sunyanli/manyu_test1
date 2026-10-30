package com.alipay.xchain.demo.model.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 维度分类调用次数。
 *
 * @author xchain
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StatsItemVO {

    /** 维度分类名称，如 研发工程师 / P6 / 技术部 */
    private String name;

    /** 调用次数 */
    private Long callCount;
}
