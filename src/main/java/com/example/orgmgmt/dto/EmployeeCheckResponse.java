package com.example.orgmgmt.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 员工检查响应
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeCheckResponse {

    private Boolean isExist;
}