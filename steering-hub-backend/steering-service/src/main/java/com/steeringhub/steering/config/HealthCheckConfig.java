package com.steeringhub.steering.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
@EnableAsync
public class HealthCheckConfig {

    @Value("${health-check.async-thread-pool-size:2}")
    private int poolSize;

    @Bean("healthCheckExecutor")
    public ThreadPoolTaskExecutor healthCheckExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(poolSize);
        executor.setMaxPoolSize(poolSize);
        executor.setQueueCapacity(10);
        executor.setThreadNamePrefix("health-check-");
        executor.initialize();
        return executor;
    }
}
