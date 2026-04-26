package com.example.demo.dto;


import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateJobRequest {
    @NotBlank private String jobType;
    @NotBlank private String inputText;
    private String idempotencyKey;
    private String callbackUrl;   // optional webhook URL
}
