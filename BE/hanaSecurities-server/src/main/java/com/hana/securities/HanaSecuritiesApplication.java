package com.hana.securities;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@MapperScan("com.hana.securities.mapper")
@EnableScheduling
public class HanaSecuritiesApplication {
    public static void main(String[] args) {
        SpringApplication.run(HanaSecuritiesApplication.class, args);
    }
}