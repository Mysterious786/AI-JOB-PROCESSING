package com.example.demo.config;


import org.springframework.amqp.core.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class RabbitMQConfig {
    @Value("${contract.queue.exchange:ai.jobs}")
    private String exchangeName;

    @Value("${contract.queue.name:ai.jobs.new}")
    private String queueName;

    @Value("${contract.queue.routing-key:job.new}")
    private String routingKey;

    // Dead Letter Queue names (must match worker service)
    public static final String DLQ_NAME    = "ai.jobs.dlq";
    public static final String DLQ_EXCHANGE = "ai.jobs.dlx";

    // ── Dead Letter Exchange & Queue ──────────────────────────────────────────

    @Bean
    public DirectExchange deadLetterExchange() {
        return new DirectExchange(DLQ_EXCHANGE, true, false);
    }

    @Bean
    public Queue deadLetterQueue() {
        return QueueBuilder.durable(DLQ_NAME).build();
    }

    @Bean
    public Binding dlqBinding(Queue deadLetterQueue, DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(deadLetterQueue).to(deadLetterExchange).with(DLQ_NAME);
    }

    // ── Main Queue (with DLQ configured) ─────────────────────────────────────

    @Bean
    public TopicExchange exchange() {
        return new TopicExchange(exchangeName, true, false);
    }

    @Bean
    public Queue queue() {
        Map<String, Object> args = new HashMap<>();
        args.put("x-dead-letter-exchange", DLQ_EXCHANGE);
        args.put("x-dead-letter-routing-key", DLQ_NAME);
        // Message priority support (0-10)
        args.put("x-max-priority", 10);
        return QueueBuilder.durable(queueName).withArguments(args).build();
    }

    @Bean
    public Binding binding(Queue queue, TopicExchange exchange) {
        return BindingBuilder.bind(queue).to(exchange).with(routingKey);
    }

    public String getExchangeName() {
        return exchangeName;
    }

    public String getRoutingKey() {
        return routingKey;
    }
}
