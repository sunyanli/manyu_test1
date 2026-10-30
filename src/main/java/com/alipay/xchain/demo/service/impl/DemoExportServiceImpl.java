package com.alipay.xchain.demo.service.impl;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.alipay.xchain.demo.common.BizException;
import com.alipay.xchain.demo.common.DemoConsts;
import com.alipay.xchain.demo.common.ErrorCode;
import com.alipay.xchain.demo.common.enums.ApiNameEnum;
import com.alipay.xchain.demo.common.enums.DimensionEnum;
import com.alipay.xchain.demo.dal.entity.ApiCallRecord;
import com.alipay.xchain.demo.dal.mapper.ApiCallRecordMapper;
import com.alipay.xchain.demo.model.vo.StatsItemVO;
import com.alipay.xchain.demo.service.DemoExportService;

/**
 * 页面展示结果导出服务实现。
 *
 * @author xchain
 */
@Service
public class DemoExportServiceImpl implements DemoExportService {

    private static final Logger LOGGER = LoggerFactory.getLogger(DemoExportServiceImpl.class);

    private static final String[] RECORD_HEADERS = {
            "调用时间", "接口", "调用人工号", "调用人姓名", "人员类型", "人员层级", "人员部门", "调用结果", "页面展示结果"
    };

    private static final String STATS_SHEET_NAME = "调用统计";

    private static final String[] STATS_HEADERS = {"统计维度", "分类名称", "调用次数"};

    private static final DateTimeFormatter CELL_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private static final String FILE_NAME_PREFIX = "api-demo-export-";

    private final ApiCallRecordMapper apiCallRecordMapper;

    public DemoExportServiceImpl(ApiCallRecordMapper apiCallRecordMapper) {
        this.apiCallRecordMapper = apiCallRecordMapper;
    }

    @Override
    public byte[] export(String type, LocalDate startDate, LocalDate endDate) {
        List<ApiNameEnum> apiNames = resolveExportApis(type);
        LocalDate resolvedEnd = endDate == null ? LocalDate.now() : endDate;
        LocalDate resolvedStart = startDate == null
                ? resolvedEnd.minusDays(DemoConsts.DEFAULT_STATS_DAYS - 1L)
                : startDate;
        if (resolvedStart.isAfter(resolvedEnd)) {
            throw new BizException(ErrorCode.PARAM_INVALID, "起始日期不能晚于结束日期");
        }
        LocalDateTime startTime = resolvedStart.atStartOfDay();
        LocalDateTime endTime = resolvedEnd.plusDays(1).atStartOfDay();

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            CellStyle headerStyle = buildHeaderStyle(workbook);
            String apiNameFilter = apiNames.size() == 1 ? apiNames.get(0).getCode() : null;
            for (ApiNameEnum apiName : apiNames) {
                List<ApiCallRecord> records = apiCallRecordMapper.selectForExport(apiName.getCode(),
                        startTime, endTime);
                fillRecordSheet(workbook, headerStyle, apiName, records);
            }
            fillStatsSheet(workbook, headerStyle, apiNameFilter, startTime, endTime);
            workbook.write(outputStream);
            LOGGER.info("导出完成, type: {}, start: {}, end: {}, apis: {}", type, resolvedStart, resolvedEnd,
                    apiNames.size());
            return outputStream.toByteArray();
        } catch (IOException e) {
            LOGGER.error("导出文件生成失败, type: {}", type, e);
            throw new BizException(ErrorCode.SYSTEM_ERROR, "导出文件生成失败");
        }
    }

    @Override
    public String buildFileName(String type) {
        return FILE_NAME_PREFIX + type + "-" + LocalDate.now() + "." + DemoConsts.EXPORT_FORMAT_XLSX;
    }

    private List<ApiNameEnum> resolveExportApis(String type) {
        if (type == null || type.isBlank() || DemoConsts.EXPORT_TYPE_ALL.equalsIgnoreCase(type.trim())) {
            List<ApiNameEnum> all = new ArrayList<>();
            for (ApiNameEnum item : ApiNameEnum.values()) {
                all.add(item);
            }
            return all;
        }
        ApiNameEnum apiName = ApiNameEnum.of(type.trim());
        if (apiName == null) {
            throw new BizException(ErrorCode.EXPORT_TYPE_NOT_SUPPORTED, "不支持的导出类型: " + type);
        }
        List<ApiNameEnum> single = new ArrayList<>();
        single.add(apiName);
        return single;
    }

    private CellStyle buildHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        style.setBorderBottom(BorderStyle.THIN);
        return style;
    }

    private void fillRecordSheet(Workbook workbook, CellStyle headerStyle, ApiNameEnum apiName,
                                 List<ApiCallRecord> records) {
        Sheet sheet = workbook.createSheet(apiName.getDescription());
        Row header = sheet.createRow(0);
        for (int i = 0; i < RECORD_HEADERS.length; i++) {
            Cell cell = header.createCell(i);
            cell.setCellValue(RECORD_HEADERS[i]);
            cell.setCellStyle(headerStyle);
        }
        int rowIndex = 1;
        for (ApiCallRecord record : records) {
            Row row = sheet.createRow(rowIndex++);
            row.createCell(0).setCellValue(formatTime(record.getCallTime()));
            row.createCell(1).setCellValue(apiName.getCode());
            row.createCell(2).setCellValue(nullSafe(record.getCallerId()));
            row.createCell(3).setCellValue(nullSafe(record.getCallerName()));
            row.createCell(4).setCellValue(nullSafe(record.getPersonType()));
            row.createCell(5).setCellValue(nullSafe(record.getPersonLevel()));
            row.createCell(6).setCellValue(nullSafe(record.getPersonDept()));
            row.createCell(7).setCellValue(nullSafe(record.getResultStatus()));
            row.createCell(8).setCellValue(nullSafe(record.getResultSummary()));
        }
        for (int i = 0; i < RECORD_HEADERS.length; i++) {
            sheet.setColumnWidth(i, 22 * 256);
        }
    }

    private void fillStatsSheet(Workbook workbook, CellStyle headerStyle, String apiNameFilter,
                                LocalDateTime startTime, LocalDateTime endTime) {
        Sheet sheet = workbook.createSheet(STATS_SHEET_NAME);
        Row header = sheet.createRow(0);
        for (int i = 0; i < STATS_HEADERS.length; i++) {
            Cell cell = header.createCell(i);
            cell.setCellValue(STATS_HEADERS[i]);
            cell.setCellStyle(headerStyle);
        }
        int rowIndex = 1;
        for (DimensionEnum dimension : DimensionEnum.values()) {
            List<StatsItemVO> items = apiCallRecordMapper.countByDimension(dimension.getCode(),
                    apiNameFilter, startTime, endTime);
            if (items == null || items.isEmpty()) {
                continue;
            }
            for (StatsItemVO item : items) {
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(dimension.getDescription());
                row.createCell(1).setCellValue(nullSafe(item.getName()));
                row.createCell(2).setCellValue(item.getCallCount() == null ? 0L : item.getCallCount());
            }
        }
        for (int i = 0; i < STATS_HEADERS.length; i++) {
            sheet.setColumnWidth(i, 22 * 256);
        }
    }

    private String formatTime(LocalDateTime time) {
        return time == null ? "" : time.format(CELL_TIME_FORMATTER);
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
