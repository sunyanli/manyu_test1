package com.example.orgmgmt.dto;

import lombok.Data;

/**
 * 唯一性校验请求
 */
@Data
public class CheckRequest {

    private String field;

    private String value;
}