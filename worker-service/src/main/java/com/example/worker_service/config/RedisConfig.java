package com.example.worker_service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.StringRedisSerializer;


@Configuration
public class RedisConfig {

    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        // Try environment variable first, fallback to hardcoded
        String redisHost = System.getenv("REDIS_HOST");
        if (redisHost == null || redisHost.isEmpty()) {
            redisHost = "red-d7mv0orbc2fs738grg0g";
        }
        
        String redisPortStr = System.getenv("REDIS_PORT");
        int redisPort = 6379;
        if (redisPortStr != null && !redisPortStr.isEmpty()) {
            try {
                redisPort = Integer.parseInt(redisPortStr);
            } catch (NumberFormatException e) {
                redisPort = 6379;
            }
        }
        
        System.out.println("REDIS CONFIG: Connecting to " + redisHost + ":" + redisPort);
        LettuceConnectionFactory factory = new LettuceConnectionFactory(redisHost, redisPort);
        return factory;
    }

    @Bean
    public RedisTemplate<String, String> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, String> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new StringRedisSerializer());
        return template;
    }
}