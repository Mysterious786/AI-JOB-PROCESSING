package com.example.worker_service.consumer;

import com.example.worker_service.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * Consumes messages that have been dead-lettered after all retry attempts.
 * Marks the job as FAILED in Redis with a clear DLQ error message.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DeadLetterConsumer {

    private final RedisTemplate<String, String> redisTemplate;

    private static final String STATUS_KEY  = "job:status:%s";
    private static final String ERROR_KEY   = "job:error:%s";
    private static final String UPDATED_KEY = "job:updatedat:%s";

    @RabbitListener(queues = RabbitMQConfig.DLQ_NAME)
    public void handleDeadLetter(String message) {
        log.error("event=JOB_DEAD_LETTERED message={}", message);

        String[] parts = message.split(":", 3);
        if (parts.length < 2) {
            log.error("Cannot parse dead-lettered message: {}", message);
            return;
        }

        String jobId = parts[0];
        try {
            redisTemplate.opsForValue().set(
                String.format(STATUS_KEY, jobId), "FAILED");
            redisTemplate.opsForValue().set(
                String.format(ERROR_KEY, jobId),
                "Job failed after 3 retry attempts and was moved to the dead-letter queue.");
            redisTemplate.opsForValue().set(
                String.format(UPDATED_KEY, jobId), Instant.now().toString());
            log.warn("event=DLQ_JOB_MARKED_FAILED jobId={}", jobId);
        } catch (Exception e) {
            log.error("Failed to update Redis for dead-lettered job {}: {}", jobId, e.getMessage());
        }
    }
}
