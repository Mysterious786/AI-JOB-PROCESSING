package com.example.worker_service.processor;



import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Component;

@Slf4j
@Component("SUMMARIZE")
public class SummarizeProcessor implements JobProcessor {
    private final ChatClient chatClient;

    public SummarizeProcessor(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    @Override
    public String process(String inputText) {
        log.debug("Summarizing input with OpenAI, length={} characters", inputText.length());
        try {
            String result = chatClient
                    .prompt()
                    .system("""
                            You are a knowledgeable and concise assistant.
                            - If the input is a question or a short topic (e.g. "what is cache", "explain JWT"), \
                            provide a clear, helpful answer summarized into 3-5 bullet points.
                            - If the input is a long piece of text, summarize it into 3-5 bullet points.
                            - Each bullet point should be a complete, informative sentence.
                            - Do not say "The user asked..." or repeat the question. Just answer directly.
                            - Use plain text only, no markdown headers.
                            """)
                    .user(inputText)
                    .call()
                    .content();
            log.info("OpenAI summarization completed, result length={}", result != null ? result.length() : 0);
            return result != null ? result : "No summary generated.";
        } catch (Exception e) {
            log.error("OpenAI summarization failed: {}", e.getMessage(), e);
            throw new IllegalStateException("OpenAI summarization failed: " + e.getMessage(), e);
        }
    }
}