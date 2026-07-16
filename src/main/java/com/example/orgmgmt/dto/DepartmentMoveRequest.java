package com.example.orgmgmt.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 部门移动请求 DTO
 */
@Data
public class DepartmentMoveRequest {

    /** 新父部门ID */
    @NotNull(message = "新父部门ID不能为空")
    private Long newParentId;
}