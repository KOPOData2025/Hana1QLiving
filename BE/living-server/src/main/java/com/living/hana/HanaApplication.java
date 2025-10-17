package com.living.hana;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan({"com.living.hana.mapper"})
public class HanaApplication {

	public static void main(String[] args) {
		SpringApplication.run(HanaApplication.class, args);
	}

}
