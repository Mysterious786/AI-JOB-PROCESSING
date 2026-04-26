package com.example.demo.controller;

import com.example.demo.config.UpstreamProperties;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;

@RestController
public class CoreProxyController {

    private static final List<String> HOP_BY_HOP_HEADERS = List.of(
            "connection",
            "keep-alive",
            "proxy-authenticate",
            "proxy-authorization",
            "te",
            "trailers",
            "transfer-encoding",
            "upgrade",
            "host"
    );

    private final RestTemplate restTemplate;
    private final UpstreamProperties upstreamProperties;

    public CoreProxyController(RestTemplate restTemplate, UpstreamProperties upstreamProperties) {
        this.restTemplate = restTemplate;
        this.upstreamProperties = upstreamProperties;
    }

    @RequestMapping(
            value = {"/auth/**", "/api/**"},
            method = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.PATCH, RequestMethod.OPTIONS}
    )
    public ResponseEntity<byte[]> proxyCoreApi(HttpServletRequest request, @RequestBody(required = false) byte[] body) {
        return proxyRequest(upstreamProperties.getCoreService(), request.getRequestURI(), request, body);
    }

    @RequestMapping(
            value = {"/core/actuator/**"},
            method = {RequestMethod.GET, RequestMethod.OPTIONS}
    )
    public ResponseEntity<byte[]> proxyCoreActuator(HttpServletRequest request, @RequestBody(required = false) byte[] body) {
        String rewrittenPath = request.getRequestURI().replaceFirst("^/core", "");
        return proxyRequest(upstreamProperties.getCoreService(), rewrittenPath, request, body);
    }

    @RequestMapping(
            value = {"/worker/actuator/**"},
            method = {RequestMethod.GET, RequestMethod.OPTIONS}
    )
    public ResponseEntity<byte[]> proxyWorkerActuator(HttpServletRequest request, @RequestBody(required = false) byte[] body) {
        String rewrittenPath = request.getRequestURI().replaceFirst("^/worker", "");
        return proxyRequest(upstreamProperties.getWorkerService(), rewrittenPath, request, body);
    }

    private ResponseEntity<byte[]> proxyRequest(String targetBaseUrl, String path, HttpServletRequest request, byte[] body) {
        URI targetUri = UriComponentsBuilder
                .fromHttpUrl(targetBaseUrl)
                .path(path)
                .query(request.getQueryString())
                .build(true)
                .toUri();

        HttpHeaders headers = new HttpHeaders();
        copyHeaders(request, headers);

        HttpMethod method = HttpMethod.valueOf(request.getMethod());
        HttpEntity<byte[]> entity = new HttpEntity<>(body, headers);
        ResponseEntity<byte[]> response;
        try {
            response = restTemplate.exchange(targetUri, method, entity, byte[].class);
        } catch (HttpStatusCodeException ex) {
            response = ResponseEntity.status(ex.getStatusCode())
                    .headers(ex.getResponseHeaders() != null ? ex.getResponseHeaders() : HttpHeaders.EMPTY)
                    .body(ex.getResponseBodyAsByteArray());
        }

        HttpHeaders responseHeaders = new HttpHeaders();
        response.getHeaders().forEach((name, values) -> {
            if (!HOP_BY_HOP_HEADERS.contains(name.toLowerCase())) {
                responseHeaders.put(name, values);
            }
        });

        return ResponseEntity.status(response.getStatusCode())
                .headers(responseHeaders)
                .body(response.getBody());
    }

    private void copyHeaders(HttpServletRequest request, HttpHeaders headers) {
        Enumeration<String> headerNames = request.getHeaderNames();
        if (headerNames == null) {
            return;
        }

        for (String headerName : Collections.list(headerNames)) {
            if (HOP_BY_HOP_HEADERS.contains(headerName.toLowerCase())) {
                continue;
            }
            headers.put(headerName, Collections.list(request.getHeaders(headerName)));
        }
    }
}
