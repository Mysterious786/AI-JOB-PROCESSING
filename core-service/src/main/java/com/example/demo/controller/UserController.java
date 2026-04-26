package com.example.demo.controller;

import com.example.demo.dto.QuotaResponse;
import com.example.demo.service.AuditService;
import com.example.demo.service.JobService;
import com.example.demo.service.RateLimitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final AuditService auditService;
    private final RateLimitService rateLimitService;
    private final JobService jobService;

    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getProfile(Authentication authentication) {
        String email = authentication.getName();
        long used = rateLimitService.getCurrentCount(email);
        int limit = rateLimitService.getLimit();
        int totalJobs = jobService.listJobs(email).size();
        return ResponseEntity.ok(Map.of(
            "email", email,
            "totalJobs", totalJobs,
            "quotaUsed", used,
            "quotaLimit", limit,
            "quotaRemaining", Math.max(0, limit - used)
        ));
    }

    @GetMapping("/audit")
    public ResponseEntity<List<String>> getAuditLog(Authentication authentication) {
        return ResponseEntity.ok(auditService.getAuditLog(authentication.getName()));
    }
}
