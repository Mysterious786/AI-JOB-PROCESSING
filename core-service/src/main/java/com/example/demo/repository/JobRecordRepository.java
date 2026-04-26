package com.example.demo.repository;

import com.example.demo.entity.JobRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface JobRecordRepository extends JpaRepository<JobRecord, String> {

    Page<JobRecord> findByUserEmailOrderByCreatedAtDesc(String userEmail, Pageable pageable);

    Page<JobRecord> findByUserEmailAndCreatedAtBetweenOrderByCreatedAtDesc(
            String userEmail, Instant from, Instant to, Pageable pageable);

    Page<JobRecord> findByUserEmailAndStatusOrderByCreatedAtDesc(
            String userEmail, String status, Pageable pageable);

    Page<JobRecord> findByUserEmailAndJobTypeOrderByCreatedAtDesc(
            String userEmail, String jobType, Pageable pageable);
}
