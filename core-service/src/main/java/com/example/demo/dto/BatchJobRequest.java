package com.example.demo.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class BatchJobRequest {

    @NotEmpty(message = "jobs list must not be empty")
    @Size(max = 20, message = "max 20 jobs per batch")
    @Valid
    private List<CreateJobRequest> jobs;
}
