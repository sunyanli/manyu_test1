package com.example.orgmgmt.constant;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 员工状态常量
 */
@Getter
@AllArgsConstructor
public enum EmpStatus {

    ACTIVE("active"),
    RESIGNED("resigned");

    private final String value;
}