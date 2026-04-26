package com.example.worker_service.processor;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class ProcessorFactory {

    private final Map<String, JobProcessor> processors;

    public JobProcessor getProcessor(String type) {
        String key = type.toUpperCase();
        JobProcessor processor = processors.get(key);
        if (processor == null) {
            log.error("Unknown job type: {}", type);
            throw new IllegalArgumentException("Unknown job type: " + type);
        }
        log.debug("Selected processor for type: {}", key);
        return processor;
    }
}