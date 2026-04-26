package com.example.demo.dto;


import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class JobStatusResponse {
    private String jobId;
    private String status;
    private String result;
    private String errorMessage;
    private String createdAt;
    private String updatedAt;
    private String jobType;
    private int    retryCount;
    private String callbackUrl;
}
