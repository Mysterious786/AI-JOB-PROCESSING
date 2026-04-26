package com.example.worker_service.processor;


import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Component;

@Slf4j
@Component("CLASSIFY")
public class ClassifyProcessor implements JobProcessor {
    private final ChatClient chatClient;

    public ClassifyProcessor(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    @Override
    public String process(String inputText) {
        log.debug("Classifying input with OpenAI");
        try {
            String label = chatClient
                    .prompt()
                    .system("""
                            Classify the text into exactly one label from: support, sales, billing, technical, general.
                            Respond in this exact format (two lines):
                            Label: <label>
                            Reason: <one sentence explaining why>
                            """)
                    .user(inputText)
                    .call()
                    .content();
            String normalized = label == null ? "Label: general\nReason: Could not determine category." : label.trim();
            log.info("OpenAI classification result: {}", normalized);
            return normalized;
        } catch (Exception e) {
            log.error("OpenAI classification failed: {}", e.getMessage(), e);
            throw new IllegalStateException("OpenAI classification failed: " + e.getMessage(), e);
        }
    }
}