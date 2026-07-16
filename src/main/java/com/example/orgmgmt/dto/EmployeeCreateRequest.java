package com.example.orgmgmt.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDate;

/**
 * 员工创建请求
 */
@Data
public class EmployeeCreateRequest {

    @NotBlank
    private String name;

    @NotBlank
    @Size(min = 4, max = 32)
    private String employeeNo;

    @NotBlank
    @Pattern(regexp = "1[3-9]\\d{9}")
    private String phone;

    @Email
    private String email;

    @NotNull
    private Long deptId;

    private String position;

    @NotNull
    private LocalDate hireDate;
}