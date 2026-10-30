package com.alipay.xchain.demo.model.request;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 冒泡排序请求体。
 *
 * @author xchain
 */
@Data
public class SortRequest {

    /** 待排序数组，元素个数不超过 100 */
    @NotEmpty(message = "待排序数组不能为空")
    @Size(max = 100, message = "数组元素个数不能超过 100")
    private List<@NotNull(message = "数组元素不能为 null") Integer> numbers;

    /** 排序顺序，默认 asc，可选 asc / desc */
    private String order;
}
