package com.example.orgmgmt.dto;

import lombok.Data;

import java.time.LocalDate;

/**
 * 员工离职请求
 */
@Data
public class EmployeeResignRequest {

    private LocalDate resignDate;
}