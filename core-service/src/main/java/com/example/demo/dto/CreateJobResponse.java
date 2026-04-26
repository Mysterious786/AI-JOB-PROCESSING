package com.example.demo.dto;


import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CreateJobResponse {
    private String jobId;
    private String status;
}
