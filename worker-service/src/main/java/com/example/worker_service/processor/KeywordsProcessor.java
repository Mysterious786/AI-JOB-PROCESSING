package com.example.worker_service.processor;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Component;

@Slf4j
@Component("KEYWORDS")
public class KeywordsProcessor implements JobProcessor {
    private final ChatClient chatClient;

    public KeywordsProcessor(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    @Override
    public String process(String inputText) {
        log.debug("Extracting keywords with OpenAI");
        try {
            String result = chatClient
                    .prompt()
                    .system("""
                            You are a keyword extraction expert.
                            Extract the top 5-8 most important keywords or key phrases from the given text.
                            If the input is a question or short topic, generate relevant keywords for that topic.
                            Respond in exactly this format:
                            Keywords: keyword1, keyword2, keyword3, keyword4, keyword5
                            Context: <one sentence describing what the text is about>
                            """)
                    .user(inputText)
                    .call()
                    .content();
            log.info("OpenAI keyword extraction completed");
            return result != null ? result : "No keywords extracted.";
        } catch (Exception e) {
            log.error("OpenAI keyword extraction failed: {}", e.getMessage(), e);
            throw new IllegalStateException("OpenAI keyword extraction failed: " + e.getMessage(), e);
        }
    }
}
