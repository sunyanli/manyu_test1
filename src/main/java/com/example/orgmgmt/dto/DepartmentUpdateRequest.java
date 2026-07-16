package com.example.orgmgmt.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 部门更新请求 DTO
 */
@Data
public class DepartmentUpdateRequest {

    /** 部门名称 */
    @NotBlank(message = "部门名称不能为空")
    private String name;

    /** 部门主管ID */
    private Long managerId;

    /** 排序 */
    private Integer sortOrder;
}