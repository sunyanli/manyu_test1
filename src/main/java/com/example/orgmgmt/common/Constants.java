package com.example.orgmgmt.common;

/**
 * 通用常量
 */
public class Constants {

    /** 业务错误码 */
    public static final int CODE_BAD_REQUEST = 400;
    public static final int CODE_NOT_FOUND = 404;
    public static final int CODE_SERVER_ERROR = 500;

    /** 状态 */
    public static final String STATUS_ACTIVE = "active";
    public static final String STATUS_INACTIVE = "inactive";
    public static final String STATUS_RESIGNED = "resigned";

    /** 层级限制 */
    public static final int MAX_DEPT_DEPTH = 6;

    private Constants() {
    }
}