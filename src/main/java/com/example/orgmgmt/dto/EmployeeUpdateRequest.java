package com.example.orgmgmt.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

/**
 * 员工更新请求
 */
@Data
public class EmployeeUpdateRequest {

    @NotBlank
    private String name;

    @Pattern(regexp = "1[3-9]\\d{9}")
    private String phone;

    @Email
    private String email;

    @NotNull
    private Long deptId;

    private String position;
}