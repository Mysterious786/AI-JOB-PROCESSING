package com.example.demo.service;

import com.example.demo.config.RabbitMQConfig;
import com.example.demo.dto.*;
import com.example.demo.entity.JobRecord;
import com.example.demo.repository.JobRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class JobService {

    private final StringRedisTemplate    redis;
    private final RabbitTemplate         rabbitTemplate;
    private final RabbitMQConfig         rabbitMQConfig;
    private final RateLimitService       rateLimitService;
    private final AuditService           auditService;
    private final JobRecordRepository    jobRecordRepository;

    // ── Redis key patterns ────────────────────────────────────────────────────
    @Value("${contract.redis.status-key-pattern:job:status:%s}")
    private String statusKeyPattern;
    @Value("${contract.redis.creator-key-pattern:job:creator:%s}")
    private String creatorKeyPattern;
    @Value("${contract.redis.result-key-pattern:job:result:%s}")
    private String resultKeyPattern;
    @Value("${contract.redis.error-key-pattern:job:error:%s}")
    private String errorKeyPattern;
    @Value("${contract.redis.created-at-key-pattern:job:createdat:%s}")
    private String createdAtKeyPattern;
    @Value("${contract.redis.updated-at-key-pattern:job:updatedat:%s}")
    private String updatedAtKeyPattern;

    private static final String JOB_TYPE_KEY_PATTERN     = "job:type:%s";
    private static final String JOB_INPUT_KEY_PATTERN    = "job:input:%s";      // for retry
    private static final String JOB_CALLBACK_KEY_PATTERN = "job:callback:%s";   // for webhook
    private static final String JOB_RETRY_KEY_PATTERN    = "job:retrycount:%s"; // retry counter
    private static final Duration JOB_TTL = Duration.ofDays(7);

    // ── Create single job ─────────────────────────────────────────────────────

    public CreateJobResponse createJob(CreateJobRequest request, String userEmail) {
        if (!rateLimitService.isAllowed(userEmail)) {
            throw new RuntimeException(
                String.format("Rate limit exceeded. Max %d jobs per hour.", rateLimitService.getLimit()));
        }
        return doCreateJob(request, userEmail);
    }

    // ── Batch create ──────────────────────────────────────────────────────────

    public BatchJobResponse createBatch(BatchJobRequest request, String userEmail) {
        // Check rate limit once for the whole batch
        int batchSize = request.getJobs().size();
        for (int i = 0; i < batchSize; i++) {
            if (!rateLimitService.isAllowed(userEmail)) {
                throw new RuntimeException(
                    String.format("Rate limit exceeded after %d jobs. Max %d jobs per hour.", i, rateLimitService.getLimit()));
            }
        }

        List<CreateJobResponse> results = new ArrayList<>();
        for (CreateJobRequest jobReq : request.getJobs()) {
            results.add(doCreateJob(jobReq, userEmail));
        }

        log.info("event=BATCH_CREATED user={} count={}", userEmail, results.size());
        auditService.log(userEmail, "BATCH_CREATED", "count=" + results.size());

        return BatchJobResponse.builder()
                .total(results.size())
                .jobs(results)
                .build();
    }

    // ── Retry a failed job ────────────────────────────────────────────────────

    public CreateJobResponse retryJob(String jobId, String userEmail) {
        // Ownership check
        String creator = redis.opsForValue().get(key(creatorKeyPattern, jobId));
        if (creator == null || !creator.equals(userEmail)) {
            throw new RuntimeException("Job not found or access denied");
        }

        String status = redis.opsForValue().get(key(statusKeyPattern, jobId));
        if (!"FAILED".equals(status)) {
            throw new RuntimeException("Only FAILED jobs can be retried. Current status: " + status);
        }

        // Retrieve original input stored at creation time
        String jobType  = redis.opsForValue().get(String.format(JOB_TYPE_KEY_PATTERN, jobId));
        String input    = redis.opsForValue().get(String.format(JOB_INPUT_KEY_PATTERN, jobId));
        String callback = redis.opsForValue().get(String.format(JOB_CALLBACK_KEY_PATTERN, jobId));

        if (jobType == null || input == null) {
            throw new RuntimeException("Cannot retry: original job data not found in cache");
        }

        // Increment retry counter
        String retryKey = String.format(JOB_RETRY_KEY_PATTERN, jobId);
        Long retryCount = redis.opsForValue().increment(retryKey);
        redis.expire(retryKey, JOB_TTL);

        // Reset status back to CREATED
        String now = Instant.now().toString();
        redis.opsForValue().set(key(statusKeyPattern, jobId), "CREATED");
        redis.delete(key(resultKeyPattern, jobId));
        redis.delete(key(errorKeyPattern, jobId));
        redis.opsForValue().set(key(updatedAtKeyPattern, jobId), now);

        // Update PostgreSQL record
        jobRecordRepository.findById(jobId).ifPresent(record -> {
            record.setStatus("CREATED");
            record.setResult(null);
            record.setErrorMessage(null);
            record.setRetryCount(retryCount != null ? retryCount.intValue() : 1);
            record.setUpdatedAt(Instant.now());
            jobRecordRepository.save(record);
        });

        // Re-queue the original message
        String message = jobId + ":" + jobType + ":" + input
                + (callback != null ? "::" + callback : "");
        rabbitTemplate.convertAndSend(rabbitMQConfig.getExchangeName(), rabbitMQConfig.getRoutingKey(), message);

        log.info("event=JOB_RETRIED jobId={} user={} retryCount={}", jobId, userEmail, retryCount);
        auditService.log(userEmail, "JOB_RETRIED", "jobId=" + jobId + " retryCount=" + retryCount);

        return CreateJobResponse.builder().jobId(jobId).status("CREATED").build();
    }

    // ── Get single job status ─────────────────────────────────────────────────

    public JobStatusResponse getJobStatus(String jobId, String userEmail) {
        String creator = redis.opsForValue().get(key(creatorKeyPattern, jobId));
        if (creator == null || !creator.equals(userEmail)) {
            throw new RuntimeException("Job not found or access denied");
        }

        String status      = redis.opsForValue().get(key(statusKeyPattern, jobId));
        String result      = redis.opsForValue().get(key(resultKeyPattern, jobId));
        String errorMsg    = redis.opsForValue().get(key(errorKeyPattern, jobId));
        String createdAt   = redis.opsForValue().get(key(createdAtKeyPattern, jobId));
        String updatedAt   = redis.opsForValue().get(key(updatedAtKeyPattern, jobId));
        String jobType     = redis.opsForValue().get(String.format(JOB_TYPE_KEY_PATTERN, jobId));
        String callbackUrl = redis.opsForValue().get(String.format(JOB_CALLBACK_KEY_PATTERN, jobId));
        String retryStr    = redis.opsForValue().get(String.format(JOB_RETRY_KEY_PATTERN, jobId));
        int    retryCount  = retryStr != null ? Integer.parseInt(retryStr) : 0;

        // Sync PostgreSQL record if status changed
    jobRecordRepository.findById(jobId).ifPresent(record -> {
      boolean changed = false;
      if (status != null && !status.equals(record.getStatus())) {
        record.setStatus(status);
        changed = true;
      }
      if (result != null && !result.equals(record.getResult())) {
        record.setResult(result);
        changed = true;
      }
      if (errorMsg != null && !errorMsg.equals(record.getErrorMessage())) {
        record.setErrorMessage(errorMsg);
        changed = true;
      }
      if (changed) {
        record.setUpdatedAt(Instant.now());
        jobRecordRepository.save(record);
      }
    });

    return JobStatusResponse.builder()
                .jobId(jobId)
                .status(status != null ? status : "UNKNOWN")
                .result(result)
                .errorMessage(errorMsg)
                .createdAt(createdAt)
                .updatedAt(updatedAt)
                .jobType(jobType)
                .callbackUrl(callbackUrl)
                .retryCount(retryCount)
                .build();
    }

    // ── List all jobs (Redis hot path) ────────────────────────────────────────

    public List<JobStatusResponse> listJobs(String userEmail) {
        Set<String> jobIds = redis.opsForSet().members("user:jobs:" + userEmail);
        if (jobIds == null || jobIds.isEmpty()) return new ArrayList<>();

        List<JobStatusResponse> jobs = new ArrayList<>();
        for (String jobId : jobIds) {
            try { jobs.add(getJobStatus(jobId, userEmail)); }
            catch (Exception e) { log.warn("Skipping job {} for user {}: {}", jobId, userEmail, e.getMessage()); }
        }
        jobs.sort((a, b) -> {
            if (a.getCreatedAt() == null) return 1;
            if (b.getCreatedAt() == null) return -1;
            return b.getCreatedAt().compareTo(a.getCreatedAt());
        });
        return jobs;
    }

    // ── Paginated history from PostgreSQL ─────────────────────────────────────

    public JobHistoryResponse getHistory(String userEmail, int page, int size,
                                         String status, String jobType,
                                         Instant from, Instant to) {
        PageRequest pageable = PageRequest.of(page, size);
        Page<JobRecord> pageResult;

        if (from != null && to != null) {
            pageResult = jobRecordRepository
                .findByUserEmailAndCreatedAtBetweenOrderByCreatedAtDesc(userEmail, from, to, pageable);
        } else if (status != null && !status.isBlank()) {
            pageResult = jobRecordRepository
                .findByUserEmailAndStatusOrderByCreatedAtDesc(userEmail, status.toUpperCase(), pageable);
        } else if (jobType != null && !jobType.isBlank()) {
            pageResult = jobRecordRepository
                .findByUserEmailAndJobTypeOrderByCreatedAtDesc(userEmail, jobType.toLowerCase(), pageable);
        } else {
            pageResult = jobRecordRepository
                .findByUserEmailOrderByCreatedAtDesc(userEmail, pageable);
        }

        List<JobStatusResponse> jobs = pageResult.getContent().stream()
                .map(r -> JobStatusResponse.builder()
                        .jobId(r.getJobId())
                        .status(r.getStatus())
                        .result(r.getResult())
                        .errorMessage(r.getErrorMessage())
                        .createdAt(r.getCreatedAt() != null ? r.getCreatedAt().toString() : null)
                        .updatedAt(r.getUpdatedAt() != null ? r.getUpdatedAt().toString() : null)
                        .jobType(r.getJobType())
                        .callbackUrl(r.getCallbackUrl())
                        .retryCount(r.getRetryCount())
                        .build())
                .toList();

        return JobHistoryResponse.builder()
                .page(page)
                .size(size)
                .totalElements(pageResult.getTotalElements())
                .totalPages(pageResult.getTotalPages())
                .jobs(jobs)
                .build();
    }

    // ── Delete job ────────────────────────────────────────────────────────────

    public void deleteJob(String jobId, String userEmail) {
        String creator = redis.opsForValue().get(key(creatorKeyPattern, jobId));
        if (creator == null || !creator.equals(userEmail)) {
            throw new RuntimeException("Job not found or access denied");
        }
        redis.delete(key(statusKeyPattern, jobId));
        redis.delete(key(creatorKeyPattern, jobId));
        redis.delete(key(resultKeyPattern, jobId));
        redis.delete(key(errorKeyPattern, jobId));
        redis.delete(key(createdAtKeyPattern, jobId));
        redis.delete(key(updatedAtKeyPattern, jobId));
        redis.delete(String.format(JOB_TYPE_KEY_PATTERN, jobId));
        redis.delete(String.format(JOB_INPUT_KEY_PATTERN, jobId));
        redis.delete(String.format(JOB_CALLBACK_KEY_PATTERN, jobId));
        redis.delete(String.format(JOB_RETRY_KEY_PATTERN, jobId));
        redis.opsForSet().remove("user:jobs:" + userEmail, jobId);
        log.info("event=JOB_DELETED jobId={} user={}", jobId, userEmail);
        auditService.log(userEmail, "JOB_DELETED", "jobId=" + jobId);
    }

    // ── Internal: create + persist ────────────────────────────────────────────

    private CreateJobResponse doCreateJob(CreateJobRequest request, String userEmail) {
        String jobId = UUID.randomUUID().toString();
        String now   = Instant.now().toString();

        // Redis hot path
        redis.opsForValue().set(key(statusKeyPattern, jobId), "CREATED");
        redis.opsForValue().set(key(creatorKeyPattern, jobId), userEmail);
        redis.opsForValue().set(key(createdAtKeyPattern, jobId), now);
        redis.opsForValue().set(key(updatedAtKeyPattern, jobId), now);
        redis.opsForValue().set(String.format(JOB_TYPE_KEY_PATTERN, jobId), request.getJobType());
        redis.opsForValue().set(String.format(JOB_INPUT_KEY_PATTERN, jobId), request.getInputText());
        if (request.getCallbackUrl() != null && !request.getCallbackUrl().isBlank()) {
            redis.opsForValue().set(String.format(JOB_CALLBACK_KEY_PATTERN, jobId), request.getCallbackUrl());
            redis.expire(String.format(JOB_CALLBACK_KEY_PATTERN, jobId), JOB_TTL);
        }
        redis.opsForSet().add("user:jobs:" + userEmail, jobId);

        // TTLs
        redis.expire(key(statusKeyPattern, jobId), JOB_TTL);
        redis.expire(key(creatorKeyPattern, jobId), JOB_TTL);
        redis.expire(key(createdAtKeyPattern, jobId), JOB_TTL);
        redis.expire(key(updatedAtKeyPattern, jobId), JOB_TTL);
        redis.expire(String.format(JOB_TYPE_KEY_PATTERN, jobId), JOB_TTL);
        redis.expire(String.format(JOB_INPUT_KEY_PATTERN, jobId), JOB_TTL);

        // PostgreSQL persistence
        jobRecordRepository.save(JobRecord.builder()
                .jobId(jobId)
                .userEmail(userEmail)
                .jobType(request.getJobType())
                .inputText(request.getInputText())
                .status("CREATED")
                .callbackUrl(request.getCallbackUrl())
                .retryCount(0)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());

        log.info("event=JOB_CREATED jobId={} user={} status=CREATED", jobId, userEmail);
        auditService.log(userEmail, "JOB_CREATED", "jobId=" + jobId + " type=" + request.getJobType());

        // Enqueue — append callbackUrl after "::" separator so worker can parse it
        String message = jobId + ":" + request.getJobType() + ":" + request.getInputText()
                + (request.getCallbackUrl() != null && !request.getCallbackUrl().isBlank()
                   ? "::" + request.getCallbackUrl() : "");
        rabbitTemplate.convertAndSend(rabbitMQConfig.getExchangeName(), rabbitMQConfig.getRoutingKey(), message);

        return CreateJobResponse.builder().jobId(jobId).status("CREATED").build();
    }

    private String key(String pattern, String jobId) {
        return String.format(pattern, jobId);
    }
}
