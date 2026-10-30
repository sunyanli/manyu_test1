package com.alipay.xchain.demo.common;

import lombok.Data;

/**
 * 统一响应体。
 *
 * @param <T> 业务数据类型
 * @author xchain
 */
@Data
public class ApiResponse<T> {

    /** 请求是否成功 */
    private boolean success;

    /** 错误码，成功时为 null */
    private String errorCode;

    /** 错误简短信息，成功时为 "success" */
    private String errorMessage;

    /** 用户提示信息 */
    private String userTip;

    /** 业务数据，为空时返回 null */
    private T data;

    public static <T> ApiResponse<T> ok(T data) {
        ApiResponse<T> response = new ApiResponse<>();
        response.setSuccess(true);
        response.setErrorMessage("success");
        response.setData(data);
        return response;
    }

    public static <T> ApiResponse<T> error(ErrorCode errorCode, String errorMessage) {
        ApiResponse<T> response = new ApiResponse<>();
        response.setSuccess(false);
        response.setErrorCode(errorCode.getCode());
        response.setErrorMessage(errorMessage);
        response.setUserTip(errorCode.getUserTip());
        return response;
    }
}
