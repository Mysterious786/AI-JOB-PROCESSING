package com.example.demo.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class RateLimitService {

    private final StringRedisTemplate redis;

    @Value("${app.rate-limit.jobs-per-hour:20}")
    private int jobsPerHour;

    private static final String RATE_KEY = "ratelimit:jobs:%s";

    /**
     * Returns true if the user is allowed to create a job.
     * Uses a sliding window counter in Redis with 1-hour TTL.
     */
    public boolean isAllowed(String userEmail) {
        String key = String.format(RATE_KEY, userEmail);
        Long count = redis.opsForValue().increment(key);
        if (count == null) return false;
        if (count == 1) {
            // First request in this window — set TTL
            redis.expire(key, Duration.ofHours(1));
        }
        boolean allowed = count <= jobsPerHour;
        if (!allowed) {
            log.warn("Rate limit exceeded for user={} count={} limit={}", userEmail, count, jobsPerHour);
        }
        return allowed;
    }

    /** Returns how many jobs the user has submitted in the current window */
    public long getCurrentCount(String userEmail) {
        String key = String.format(RATE_KEY, userEmail);
        String val = redis.opsForValue().get(key);
        return val == null ? 0 : Long.parseLong(val);
    }

    public int getLimit() {
        return jobsPerHour;
    }
}
