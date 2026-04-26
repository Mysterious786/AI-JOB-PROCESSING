package com.example.worker_service.processor;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Component;

@Slf4j
@Component("QA")
public class QAProcessor implements JobProcessor {
    private final ChatClient chatClient;

    public QAProcessor(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    @Override
    public String process(String inputText) {
        log.debug("Answering question with OpenAI");
        try {
            String result = chatClient
                    .prompt()
                    .system("""
                            You are a knowledgeable assistant that gives clear, accurate, and well-structured answers.
                            Answer the user's question thoroughly but concisely.
                            Structure your answer with:
                            - A direct answer in the first sentence
                            - Supporting explanation in 2-4 sentences
                            - A practical example if relevant
                            Use plain text only, no markdown headers.
                            """)
                    .user(inputText)
                    .call()
                    .content();
            log.info("OpenAI Q&A completed");
            return result != null ? result : "No answer generated.";
        } catch (Exception e) {
            log.error("OpenAI Q&A failed: {}", e.getMessage(), e);
            throw new IllegalStateException("OpenAI Q&A failed: " + e.getMessage(), e);
        }
    }
}
