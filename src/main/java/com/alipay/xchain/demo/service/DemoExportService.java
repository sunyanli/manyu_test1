package com.alipay.xchain.demo.service;

import java.time.LocalDate;

/**
 * 页面展示结果导出服务。
 *
 * @author xchain
 */
public interface DemoExportService {

    /**
     * 导出页面展示结果。
     *
     * @param type      导出类型：hello / hash / sort / all
     * @param startDate 起始日期（含），为 null 时默认近 7 天
     * @param endDate   结束日期（含），为 null 时默认当天
     * @return Excel 文件字节内容
     */
    byte[] export(String type, LocalDate startDate, LocalDate endDate);

    /**
     * 计算导出文件名。
     *
     * @param type 导出类型
     * @return 文件名
     */
    String buildFileName(String type);
}
