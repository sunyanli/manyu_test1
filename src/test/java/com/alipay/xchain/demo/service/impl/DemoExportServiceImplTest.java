package com.alipay.xchain.demo.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;

import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import com.alipay.xchain.demo.common.BizException;
import com.alipay.xchain.demo.common.enums.ApiNameEnum;
import com.alipay.xchain.demo.common.enums.ResultStatusEnum;
import com.alipay.xchain.demo.service.ApiCallRecordService;
import com.alipay.xchain.demo.service.DemoExportService;
import com.alipay.xchain.demo.track.CallerInfo;

/**
 * {@link DemoExportServiceImpl} 集成测试，校验生成的 Excel 内容。
 *
 * @author xchain
 */
@SpringBootTest
class DemoExportServiceImplTest {

    @Autowired
    private DemoExportService demoExportService;

    @Autowired
    private ApiCallRecordService apiCallRecordService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM api_call_record");
        apiCallRecordService.record(ApiNameEnum.HELLO,
                new CallerInfo("1001", "张三", "研发工程师", "P6", "技术部"),
                ResultStatusEnum.SUCCESS.getCode(), "Hello World! xchain demo接口 v1.0");
        apiCallRecordService.record(ApiNameEnum.HASH,
                new CallerInfo("1002", "李四", "测试工程师", "P5", "质量部"),
                ResultStatusEnum.SUCCESS.getCode(), "SHA-256(abc) = ba7816bf");
    }

    @Test
    @DisplayName("export: 导出单个 Tab 生成业务页与统计页")
    void should_exportSingleSheetAndStats_when_typeHello() throws Exception {
        byte[] content = demoExportService.export("hello", LocalDate.now(), LocalDate.now());

        assertThat(content).isNotEmpty();
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(content))) {
            assertThat(workbook.getNumberOfSheets()).isEqualTo(2);
            Sheet recordSheet = workbook.getSheetAt(0);
            assertThat(recordSheet.getSheetName()).isEqualTo(ApiNameEnum.HELLO.getDescription());
            assertThat(recordSheet.getRow(0).getCell(0).getStringCellValue()).isEqualTo("调用时间");
            assertThat(recordSheet.getRow(1).getCell(1).getStringCellValue()).isEqualTo("hello");
            assertThat(recordSheet.getRow(1).getCell(8).getStringCellValue()).contains("Hello World");
            assertThat(workbook.getSheetAt(1).getSheetName()).isEqualTo("调用统计");
        }
    }

    @Test
    @DisplayName("export: 导出全部生成三个业务页与统计页")
    void should_exportAllSheets_when_typeAll() throws Exception {
        byte[] content = demoExportService.export("all", LocalDate.now(), LocalDate.now());

        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(content))) {
            assertThat(workbook.getNumberOfSheets()).isEqualTo(4);
            assertThat(workbook.getSheetName(0)).isEqualTo(ApiNameEnum.HELLO.getDescription());
            assertThat(workbook.getSheetName(1)).isEqualTo(ApiNameEnum.HASH.getDescription());
            assertThat(workbook.getSheetName(2)).isEqualTo(ApiNameEnum.SORT.getDescription());
            assertThat(workbook.getSheetName(3)).isEqualTo("调用统计");
        }
    }

    @Test
    @DisplayName("export: 无数据时仍返回可解析的空表格")
    void should_returnEmptyWorkbook_when_noData() throws Exception {
        jdbcTemplate.update("DELETE FROM api_call_record");

        byte[] content = demoExportService.export("sort", LocalDate.now(), LocalDate.now());

        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(content))) {
            Sheet recordSheet = workbook.getSheetAt(0);
            assertThat(recordSheet.getLastRowNum()).isZero();
            assertThat(workbook.getSheetAt(1).getLastRowNum()).isZero();
        }
    }

    @Test
    @DisplayName("export: 非法导出类型抛出异常")
    void should_throwBizException_when_typeUnsupported() {
        assertThatThrownBy(() -> demoExportService.export("unknown", LocalDate.now(), LocalDate.now()))
                .isInstanceOf(BizException.class)
                .hasMessageContaining("不支持的导出类型");
    }

    @Test
    @DisplayName("buildFileName: 文件名包含类型与日期")
    void should_buildFileNameWithTypeAndDate() {
        String fileName = demoExportService.buildFileName("hello");

        assertThat(fileName).startsWith("api-demo-export-hello-").endsWith(".xlsx");
    }
}
