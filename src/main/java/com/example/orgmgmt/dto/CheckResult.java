package com.example.orgmgmt.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 唯一性校验结果
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CheckResult {

    private Boolean isExist;
}