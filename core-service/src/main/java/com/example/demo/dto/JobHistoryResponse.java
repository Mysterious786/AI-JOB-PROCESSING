package com.example.demo.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class JobHistoryResponse {
    private int                  page;
    private int                  size;
    private long                 totalElements;
    private int                  totalPages;
    private List<JobStatusResponse> jobs;
}
