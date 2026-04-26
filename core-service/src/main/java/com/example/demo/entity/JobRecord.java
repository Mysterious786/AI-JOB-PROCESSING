package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Persistent job history stored in PostgreSQL.
 * Complements the Redis hot-path — survives beyond the 7-day TTL
 * and supports pagination / date-range queries.
 */
@Entity
@Table(name = "job_records", indexes = {
    @Index(name = "idx_job_records_user_email", columnList = "userEmail"),
    @Index(name = "idx_job_records_created_at", columnList = "createdAt")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobRecord {

    @Id
    @Column(nullable = false, updatable = false)
    private String jobId;

    @Column(nullable = false)
    private String userEmail;

    @Column(nullable = false)
    private String jobType;

    @Column(columnDefinition = "TEXT")
    private String inputText;

    @Column(nullable = false)
    private String status;          // CREATED | PROCESSING | COMPLETED | FAILED

    @Column(columnDefinition = "TEXT")
    private String result;

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    private String callbackUrl;

    @Builder.Default
    private int retryCount = 0;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    private Instant updatedAt;
}
