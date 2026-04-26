package com.example.worker_service.processor;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Component;

@Slf4j
@Component("TRANSLATE")
public class TranslateProcessor implements JobProcessor {
    private final ChatClient chatClient;

    public TranslateProcessor(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    @Override
    public String process(String inputText) {
        log.debug("Translating input with OpenAI");
        try {
            String result = chatClient
                    .prompt()
                    .system("""
                            You are a professional translator.
                            The user will provide text in the format: "translate to <language>: <text>"
                            Extract the target language and the text, then translate it accurately.
                            If no target language is specified, translate to Spanish.
                            Respond with:
                            Language: <target language>
                            Translation: <translated text>
                            """)
                    .user(inputText)
                    .call()
                    .content();
            log.info("OpenAI translation completed");
            return result != null ? result : "No translation generated.";
        } catch (Exception e) {
            log.error("OpenAI translation failed: {}", e.getMessage(), e);
            throw new IllegalStateException("OpenAI translation failed: " + e.getMessage(), e);
        }
    }
}
