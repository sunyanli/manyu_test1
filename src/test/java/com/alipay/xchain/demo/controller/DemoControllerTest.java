package com.alipay.xchain.demo.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/**
 * {@link DemoController} 接口测试，覆盖三个演示接口、统计、导出与埋点。
 *
 * @author xchain
 */
@SpringBootTest
@AutoConfigureMockMvc
class DemoControllerTest {

    private static final String HEADER_USER_ID = "X-User-Id";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanTable() {
        jdbcTemplate.update("DELETE FROM api_call_record");
    }

    @Test
    @DisplayName("GET /api/demo/hello: 返回统一响应体")
    void should_returnHello_when_getHello() throws Exception {
        mockMvc.perform(get("/api/demo/hello"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.type").value("hello"))
                .andExpect(jsonPath("$.data.message").value("Hello World! xchain demo接口 v1.0"));
    }

    @Test
    @DisplayName("POST /api/demo/hash: 返回 SHA-256 摘要")
    void should_returnDigest_when_postHash() throws Exception {
        String body = "{\"input\":\"abc\",\"algorithm\":\"SHA-256\"}";

        mockMvc.perform(post("/api/demo/hash").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.output")
                        .value("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"));
    }

    @Test
    @DisplayName("POST /api/demo/hash: 不支持的算法返回错误码 A0401")
    void should_returnErrorCode_when_hashAlgorithmUnsupported() throws Exception {
        String body = "{\"input\":\"abc\",\"algorithm\":\"SHA-512\"}";

        mockMvc.perform(post("/api/demo/hash").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("A0401"))
                .andExpect(jsonPath("$.userTip").isNotEmpty());
    }

    @Test
    @DisplayName("POST /api/demo/hash: 空原文触发参数校验")
    void should_returnParamInvalid_when_hashInputBlank() throws Exception {
        String body = "{\"input\":\"   \"}";

        mockMvc.perform(post("/api/demo/hash").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("A0400"));
    }

    @Test
    @DisplayName("POST /api/demo/sort: 返回排序结果与交换次数")
    void should_returnSortedArray_when_postSort() throws Exception {
        String body = "{\"numbers\":[5,3,8,1,9,2],\"order\":\"asc\"}";

        mockMvc.perform(post("/api/demo/sort").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sorted[0]").value(1))
                .andExpect(jsonPath("$.data.sorted[5]").value(9))
                .andExpect(jsonPath("$.data.swapCount").value(8))
                .andExpect(jsonPath("$.data.order").value("asc"));
    }

    @Test
    @DisplayName("POST /api/demo/sort: 空数组触发参数校验")
    void should_returnParamInvalid_when_sortEmpty() throws Exception {
        String body = "{\"numbers\":[]}";

        mockMvc.perform(post("/api/demo/sort").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("A0400"));
    }

    @Test
    @DisplayName("接口调用后自动写入埋点，统计数据可查询")
    void should_recordTrackAndReturnStats_when_callApi() throws Exception {
        mockMvc.perform(get("/api/demo/hello")
                        .header(HEADER_USER_ID, "1001")
                        .header("X-User-Name", "张三")
                        .header("X-Person-Type", "研发工程师")
                        .header("X-Person-Level", "P6")
                        .header("X-Person-Dept", "技术部"))
                .andExpect(status().isOk());

        Integer recordCount = waitForRecordCount(1);
        assertThat(recordCount).isEqualTo(1);

        mockMvc.perform(get("/api/demo/stats")
                        .param("dimension", "personType")
                        .param("startDate", LocalDate.now().toString())
                        .param("endDate", LocalDate.now().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCount").value(1))
                .andExpect(jsonPath("$.data.items[0].name").value("研发工程师"))
                .andExpect(jsonPath("$.data.trend[0].callCount").value(1));
    }

    @Test
    @DisplayName("GET /api/demo/stats: 非法维度返回错误码 A0403")
    void should_returnErrorCode_when_dimensionInvalid() throws Exception {
        mockMvc.perform(get("/api/demo/stats").param("dimension", "unknown"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("A0403"));
    }

    @Test
    @DisplayName("GET /api/demo/export: 返回 xlsx 文件流")
    void should_returnExcelStream_when_export() throws Exception {
        byte[] content = mockMvc.perform(get("/api/demo/export").param("type", "all"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.containsString("attachment")))
                .andReturn()
                .getResponse()
                .getContentAsByteArray();

        assertThat(content).isNotEmpty();
    }

    private Integer waitForRecordCount(int expected) throws InterruptedException {
        Integer count = 0;
        for (int i = 0; i < 30; i++) {
            count = jdbcTemplate.queryForObject("SELECT COUNT(1) FROM api_call_record", Integer.class);
            if (count != null && count >= expected) {
                return count;
            }
            Thread.sleep(100L);
        }
        return count;
    }
}
