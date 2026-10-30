package com.alipay.xchain.demo.config;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import com.alipay.xchain.demo.common.DemoConsts;

/**
 * 埋点异步线程池配置。
 *
 * @author xchain
 */
@Configuration
public class TrackExecutorConfig {

    /**
     * 埋点专用线程池，队列满时由调用线程执行以保证埋点不丢失。
     *
     * @return 线程池执行器
     */
    @Bean("apiTrackExecutor")
    public Executor apiTrackExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(DemoConsts.TRACK_CORE_POOL_SIZE);
        executor.setMaxPoolSize(DemoConsts.TRACK_MAX_POOL_SIZE);
        executor.setQueueCapacity(DemoConsts.TRACK_QUEUE_CAPACITY);
        executor.setThreadNamePrefix(DemoConsts.TRACK_THREAD_NAME_PREFIX);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.initialize();
        return executor;
    }
}
