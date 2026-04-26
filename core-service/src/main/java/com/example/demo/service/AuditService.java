package com.example.demo.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.Duration;

/**
 * Structured audit log — every significant action is recorded.
 * Stored in Redis as a list per user (last 100 events, 30-day TTL).
 * Format: ISO-timestamp | action | detail
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final StringRedisTemplate redis;

    private static final String AUDIT_KEY = "audit:%s";
    private static final long   MAX_EVENTS = 100;
    private static final Duration AUDIT_TTL = Duration.ofDays(30);

    public void log(String userEmail, String action, String detail) {
        try {
            String entry = Instant.now() + " | " + action + " | " + detail;
            String key = String.format(AUDIT_KEY, userEmail);
            redis.opsForList().leftPush(key, entry);
            redis.opsForList().trim(key, 0, MAX_EVENTS - 1);
            redis.expire(key, AUDIT_TTL);
            log.info("AUDIT user={} action={} detail={}", userEmail, action, detail);
        } catch (Exception e) {
            // Redis unavailable — log to console but don't fail the request
            log.warn("AUDIT (Redis unavailable) user={} action={} detail={} error={}", userEmail, action, detail, e.getMessage());
        }
    }

    public java.util.List<String> getAuditLog(String userEmail) {
        try {
            String key = String.format(AUDIT_KEY, userEmail);
            java.util.List<String> entries = redis.opsForList().range(key, 0, MAX_EVENTS - 1);
            return entries != null ? entries : java.util.Collections.emptyList();
        } catch (Exception e) {
            log.warn("AUDIT getAuditLog Redis unavailable for user={} error={}", userEmail, e.getMessage());
            return java.util.Collections.emptyList();
        }
    }
}
