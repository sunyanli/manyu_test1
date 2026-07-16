package com.example.orgmgmt.dto;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 员工视图对象
 */
@Data
public class EmployeeVO {

    private Long id;

    private String name;

    private String employeeNo;

    private String phone;

    private String email;

    private Long deptId;

    private String deptName;

    private String position;

    private LocalDate hireDate;

    private String status;

    private Boolean loginEnabled;

    private LocalDate resignDate;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}