package com.example.demo.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class QuotaResponse {
    private long used;
    private int limit;
    private long remaining;
}
