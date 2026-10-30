package com.alipay.xchain.demo.controller;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.alipay.xchain.demo.common.ApiResponse;
import com.alipay.xchain.demo.common.DemoConsts;
import com.alipay.xchain.demo.common.enums.ApiNameEnum;
import com.alipay.xchain.demo.common.enums.DimensionEnum;
import com.alipay.xchain.demo.model.request.HashRequest;
import com.alipay.xchain.demo.model.request.SortRequest;
import com.alipay.xchain.demo.model.vo.DemoResultVO;
import com.alipay.xchain.demo.model.vo.StatsReportVO;
import com.alipay.xchain.demo.service.ApiCallRecordService;
import com.alipay.xchain.demo.service.DemoExportService;
import com.alipay.xchain.demo.service.DemoService;
import com.alipay.xchain.demo.track.ApiTrack;

import jakarta.validation.Valid;

/**
 * 接口演示与统计报表控制器。
 *
 * @author xchain
 */
@RestController
@RequestMapping("/api/demo")
public class DemoController {

    private static final Logger LOGGER = LoggerFactory.getLogger(DemoController.class);

    private final DemoService demoService;

    private final DemoExportService demoExportService;

    private final ApiCallRecordService apiCallRecordService;

    public DemoController(DemoService demoService, DemoExportService demoExportService,
                          ApiCallRecordService apiCallRecordService) {
        this.demoService = demoService;
        this.demoExportService = demoExportService;
        this.apiCallRecordService = apiCallRecordService;
    }

    /**
     * HelloWorld 演示接口。
     *
     * @return 演示结果
     */
    @ApiTrack(apiName = ApiNameEnum.HELLO)
    @GetMapping("/hello")
    public ApiResponse<DemoResultVO> hello() {
        return ApiResponse.ok(demoService.hello());
    }

    /**
     * 哈希算法演示接口。
     *
     * @param request 哈希请求
     * @return 演示结果
     */
    @ApiTrack(apiName = ApiNameEnum.HASH)
    @PostMapping("/hash")
    public ApiResponse<DemoResultVO> hash(@Valid @RequestBody HashRequest request) {
        return ApiResponse.ok(demoService.hash(request));
    }

    /**
     * 冒泡排序演示接口。
     *
     * @param request 排序请求
     * @return 演示结果
     */
    @ApiTrack(apiName = ApiNameEnum.SORT)
    @PostMapping("/sort")
    public ApiResponse<DemoResultVO> sort(@Valid @RequestBody SortRequest request) {
        return ApiResponse.ok(demoService.sort(request));
    }

    /**
     * 调用统计查询接口。
     *
     * @param dimension 统计维度：personType / personLevel / personDept
     * @param startDate 起始日期，默认近 7 天
     * @param endDate   结束日期，默认当天
     * @param apiName   接口名，可选 hello / hash / sort
     * @return 统计报表
     */
    @GetMapping("/stats")
    public ApiResponse<StatsReportVO> stats(
            @RequestParam("dimension") String dimension,
            @RequestParam(value = "startDate", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "apiName", required = false) String apiName) {
        return ApiResponse.ok(apiCallRecordService.queryStats(DimensionEnum.of(dimension), startDate, endDate,
                apiName == null ? null : ApiNameEnum.of(apiName)));
    }

    /**
     * 页面展示结果导出接口。
     *
     * @param type      导出类型：hello / hash / sort / all，默认 all
     * @param startDate 起始日期，默认近 7 天
     * @param endDate   结束日期，默认当天
     * @return Excel 文件流
     */
    @GetMapping("/export")
    public ResponseEntity<byte[]> export(
            @RequestParam(value = "type", defaultValue = DemoConsts.EXPORT_TYPE_ALL) String type,
            @RequestParam(value = "startDate", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        byte[] content = demoExportService.export(type, startDate, endDate);
        String fileName = demoExportService.buildFileName(type);
        String encodedName = URLEncoder.encode(fileName, StandardCharsets.UTF_8).replace("+", "%20");
        LOGGER.info("导出接口调用完成, type: {}, size: {}", type, content.length);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(DemoConsts.XLSX_CONTENT_TYPE))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + encodedName + "\"; filename*=UTF-8''" + encodedName)
                .body(content);
    }
}
