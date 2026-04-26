package com.example.worker_service.processor;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Component;

@Slf4j
@Component("SENTIMENT")
public class SentimentProcessor implements JobProcessor {
    private final ChatClient chatClient;

    public SentimentProcessor(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    @Override
    public String process(String inputText) {
        log.debug("Analyzing sentiment with OpenAI");
        try {
            String result = chatClient
                    .prompt()
                    .system("""
                            You are a sentiment analysis expert.
                            Analyze the sentiment of the given text and respond in exactly this format:
                            Sentiment: <Positive|Negative|Neutral|Mixed>
                            Score: <a number from -1.0 (very negative) to 1.0 (very positive)>
                            Confidence: <High|Medium|Low>
                            Summary: <one sentence explaining the sentiment>
                            """)
                    .user(inputText)
                    .call()
                    .content();
            log.info("OpenAI sentiment analysis completed");
            return result != null ? result : "No sentiment analysis generated.";
        } catch (Exception e) {
            log.error("OpenAI sentiment analysis failed: {}", e.getMessage(), e);
            throw new IllegalStateException("OpenAI sentiment analysis failed: " + e.getMessage(), e);
        }
    }
}
