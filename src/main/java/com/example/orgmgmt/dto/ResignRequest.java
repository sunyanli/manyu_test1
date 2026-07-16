package com.example.orgmgmt.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 员工离职请求
 */
@Data
public class ResignRequest {

    @NotNull
    private String resignDate;
}