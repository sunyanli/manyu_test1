package com.example.orgmgmt.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 员工复职请求
 */
@Data
public class ReinstateRequest {

    @NotNull
    private Long deptId;

    private String position;
}