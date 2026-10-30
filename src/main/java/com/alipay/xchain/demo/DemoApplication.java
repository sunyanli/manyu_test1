package com.alipay.xchain.demo;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * 接口演示与调用统计报表服务启动类。
 *
 * @author xchain
 */
@EnableAsync
@MapperScan("com.alipay.xchain.demo.dal.mapper")
@SpringBootApplication
public class DemoApplication {

    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}
