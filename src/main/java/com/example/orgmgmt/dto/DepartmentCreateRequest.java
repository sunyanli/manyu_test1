package com.example.orgmgmt.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 部门创建请求 DTO
 */
@Data
public class DepartmentCreateRequest {

    /** 部门名称 */
    @NotBlank(message = "部门名称不能为空")
    private String name;

    /** 父部门ID，null 表示根部门 */
    private Long parentId;

    /** 排序，默认0 */
    private Integer sortOrder = 0;

    /** 部门主管ID */
    private Long managerId;
}