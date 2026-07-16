package com.example.orgmgmt.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 员工调动请求
 */
@Data
public class EmployeeTransferRequest {

    @NotNull
    private Long newDeptId;

    private String newPosition;

    private String reason;
}