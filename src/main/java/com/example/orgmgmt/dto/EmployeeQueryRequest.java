package com.example.orgmgmt.dto;

import lombok.Data;

/**
 * 员工查询请求
 */
@Data
public class EmployeeQueryRequest {

    private Integer page = 1;

    private Integer pageSize = 20;

    private Long deptId;

    private String status;

    private String keyword;
}