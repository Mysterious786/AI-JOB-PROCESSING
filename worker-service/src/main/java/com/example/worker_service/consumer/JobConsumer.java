package com.example.worker_service.consumer;

import com.example.worker_service.config.RabbitMQConfig;
import com.example.worker_service.metrics.WorkMetrics;
import com.example.worker_service.processor.ProcessorFactory;
import com.example.worker_service.service.WebhookService;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Slf4j
@Component
@RequiredArgsConstructor
public class JobConsumer {

    private final ProcessorFactory              processorFactory;
    private final RedisTemplate<String, String> redisTemplate;
    private final WorkMetrics                   metrics;
    private final RabbitMQConfig                rabbitMQConfig;
    private final WebhookService                webhookService;

    @Value("${contract.redis.status-key-pattern:job:status:%s}")
    private String statusKeyPattern;
    @Value("${contract.redis.result-key-pattern:job:result:%s}")
    private String resultKeyPattern;
    @Value("${contract.redis.error-key-pattern:job:error:%s}")
    private String errorKeyPattern;
    @Value("${contract.redis.updated-at-key-pattern:job:updatedat:%s}")
    private String updatedAtKeyPattern;

    /**
     * Message format:
     *   jobId:jobType:inputText
     *   jobId:jobType:inputText::https://callback.url   (with optional webhook)
     *
     * The "::" separator avoids collisions with ":" inside inputText.
     */
    @RabbitListener(queues = "#{rabbitMQConfig.getQueueName()}")
    public void handleMessage(String message) {
        metrics.incrementReceived();
        Timer.Sample timerSample = metrics.startTimer();
        log.info("Received message length={}", message.length());

        // ── Parse message ─────────────────────────────────────────────────────
        String callbackUrl = null;
        String core = message;

        int callbackSep = message.indexOf("::");
        if (callbackSep != -1) {
            callbackUrl = message.substring(callbackSep + 2);
            core        = message.substring(0, callbackSep);
        }

        String[] parts = core.split(":", 3);
        if (parts.length < 3) {
            log.error("Invalid message format: {}", message);
            metrics.incrementFailed();
            return;
        }

        String jobId     = parts[0];
        String jobType   = parts[1];
        String inputText = parts[2];

        // ── Mark PROCESSING ───────────────────────────────────────────────────
        try {
            redisTemplate.opsForValue().set(key(statusKeyPattern, jobId), "PROCESSING");
            redisTemplate.opsForValue().set(key(updatedAtKeyPattern, jobId), Instant.now().toString());
        } catch (Exception e) {
            log.error("Redis error setting PROCESSING for jobId={}: {}", jobId, e.getMessage());
            metrics.incrementFailed();
            return;
        }

        // ── Process ───────────────────────────────────────────────────────────
        try {
            log.info("Processing jobId={} type={}", jobId, jobType);
            String result = processorFactory.getProcessor(jobType).process(inputText);

            redisTemplate.opsForValue().set(key(resultKeyPattern, jobId), result);
            redisTemplate.opsForValue().set(key(statusKeyPattern, jobId), "COMPLETED");
            redisTemplate.delete(key(errorKeyPattern, jobId));
            redisTemplate.opsForValue().set(key(updatedAtKeyPattern, jobId), Instant.now().toString());

            metrics.incrementSucceeded();
            log.info("event=JOB_COMPLETED jobId={}", jobId);

            // Fire webhook (best-effort)
            webhookService.fire(callbackUrl, jobId, "COMPLETED", result, null);

        } catch (Exception e) {
            log.error("event=JOB_FAILED jobId={} error={}", jobId, e.getMessage(), e);
            try {
                redisTemplate.opsForValue().set(key(statusKeyPattern, jobId), "FAILED");
                redisTemplate.opsForValue().set(key(errorKeyPattern, jobId), e.getMessage());
                redisTemplate.opsForValue().set(key(updatedAtKeyPattern, jobId), Instant.now().toString());
            } catch (Exception redisEx) {
                log.error("Could not write FAILED status to Redis for jobId={}: {}", jobId, redisEx.getMessage());
            }
            metrics.incrementFailed();

            // Fire webhook on failure too
            webhookService.fire(callbackUrl, jobId, "FAILED", null, e.getMessage());

            // Re-throw so RabbitMQ retry interceptor can retry → DLQ
            throw new RuntimeException("Job processing failed: " + e.getMessage(), e);
        } finally {
            metrics.stopTimer(timerSample);
        }
    }

    private String key(String pattern, String jobId) {
        return String.format(pattern, jobId);
    }
}
