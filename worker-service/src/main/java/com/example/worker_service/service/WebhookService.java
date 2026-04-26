package com.example.worker_service.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Fires an HTTP POST to the caller-supplied callbackUrl once a job finishes.
 * Uses Java's built-in HttpClient — no extra dependency needed.
 * Failures are logged but never propagate (best-effort delivery).
 */
@Slf4j
@Service
public class WebhookService {

    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    /**
     * @param callbackUrl  the URL to POST to
     * @param jobId        job identifier
     * @param status       COMPLETED or FAILED
     * @param result       AI result (null on failure)
     * @param errorMessage error text (null on success)
     */
    public void fire(String callbackUrl, String jobId, String status,
                     String result, String errorMessage) {
        if (callbackUrl == null || callbackUrl.isBlank()) return;

        String body = String.format(
            "{\"jobId\":\"%s\",\"status\":\"%s\",\"result\":%s,\"errorMessage\":%s}",
            jobId,
            status,
            result       != null ? "\"" + escape(result)       + "\"" : "null",
            errorMessage != null ? "\"" + escape(errorMessage) + "\"" : "null"
        );

        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(callbackUrl))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
            log.info("event=WEBHOOK_FIRED jobId={} url={} responseStatus={}", jobId, callbackUrl, resp.statusCode());
        } catch (Exception e) {
            log.warn("event=WEBHOOK_FAILED jobId={} url={} error={}", jobId, callbackUrl, e.getMessage());
        }
    }

    private String escape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }
}
