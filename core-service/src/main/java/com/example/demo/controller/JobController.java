package com.example.demo.controller;

import com.example.demo.dto.*;
import com.example.demo.service.JobService;
import com.example.demo.service.RateLimitService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobService      jobService;
    private final RateLimitService rateLimitService;

    // ── Single job create ─────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<CreateJobResponse> createJob(
            @Valid @RequestBody CreateJobRequest request,
            Authentication auth) {
        return ResponseEntity.ok(jobService.createJob(request, auth.getName()));
    }

    // ── Batch create ──────────────────────────────────────────────────────────

    @PostMapping("/batch")
    public ResponseEntity<BatchJobResponse> createBatch(
            @Valid @RequestBody BatchJobRequest request,
            Authentication auth) {
        return ResponseEntity.ok(jobService.createBatch(request, auth.getName()));
    }

    // ── Retry a failed job ────────────────────────────────────────────────────

    @PostMapping("/{jobId}/retry")
    public ResponseEntity<CreateJobResponse> retryJob(
            @PathVariable String jobId,
            Authentication auth) {
        return ResponseEntity.ok(jobService.retryJob(jobId, auth.getName()));
    }

    // ── List jobs (Redis hot path) ────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<JobStatusResponse>> listJobs(Authentication auth) {
        return ResponseEntity.ok(jobService.listJobs(auth.getName()));
    }

    // ── Paginated history from PostgreSQL ─────────────────────────────────────

    @GetMapping("/history")
    public ResponseEntity<JobHistoryResponse> getHistory(
            Authentication auth,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false)    String status,
            @RequestParam(required = false)    String jobType,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        return ResponseEntity.ok(
            jobService.getHistory(auth.getName(), page, size, status, jobType, from, to));
    }

    // ── Single job status ─────────────────────────────────────────────────────

    @GetMapping("/{jobId}")
    public ResponseEntity<JobStatusResponse> getJobStatus(
            @PathVariable String jobId,
            Authentication auth) {
        return ResponseEntity.ok(jobService.getJobStatus(jobId, auth.getName()));
    }

    // ── Delete job ────────────────────────────────────────────────────────────

    @DeleteMapping("/{jobId}")
    public ResponseEntity<Void> deleteJob(
            @PathVariable String jobId,
            Authentication auth) {
        jobService.deleteJob(jobId, auth.getName());
        return ResponseEntity.noContent().build();
    }

    // ── Quota ─────────────────────────────────────────────────────────────────

    @GetMapping("/quota")
    public ResponseEntity<QuotaResponse> getQuota(Authentication auth) {
        String email = auth.getName();
        long used  = rateLimitService.getCurrentCount(email);
        int  limit = rateLimitService.getLimit();
        return ResponseEntity.ok(QuotaResponse.builder()
                .used(used)
                .limit(limit)
                .remaining(Math.max(0, limit - used))
                .build());
    }
}
