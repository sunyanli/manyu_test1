package com.example.orgmgmt;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.example.orgmgmt.mapper")
public class OrgMgmtApplication {

    public static void main(String[] args) {
        SpringApplication.run(OrgMgmtApplication.class, args);
    }
}