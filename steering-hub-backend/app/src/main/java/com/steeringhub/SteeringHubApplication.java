package com.steeringhub;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication(scanBasePackages = "com.steeringhub")
@MapperScan("com.steeringhub.**.mapper")
@EnableAsync
public class SteeringHubApplication {

    public static void main(String[] args) {
        SpringApplication.run(SteeringHubApplication.class, args);
    }
}
