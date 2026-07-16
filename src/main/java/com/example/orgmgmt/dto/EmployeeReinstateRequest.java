package com.example.orgmgmt.dto;

import lombok.Data;

/**
 * 员工复职请求
 */
@Data
public class EmployeeReinstateRequest {

    private Long deptId;

    private String position;
}