package com.example.demo;

import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.RabbitMQContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class DemoApplicationTests {

	@Container
	static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
			.withDatabaseName("ai_task_queue")
			.withUsername("admin")
			.withPassword("adminpassword");

	@Container
	static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine").withExposedPorts(6379);

	@Container
	static RabbitMQContainer rabbit = new RabbitMQContainer("rabbitmq:4-management");

	@DynamicPropertySource
	static void registerProps(DynamicPropertyRegistry registry) {
		registry.add("spring.datasource.url", postgres::getJdbcUrl);
		registry.add("spring.datasource.username", postgres::getUsername);
		registry.add("spring.datasource.password", postgres::getPassword);
		registry.add("spring.jpa.hibernate.ddl-auto", () -> "update");

		registry.add("spring.data.redis.host", redis::getHost);
		registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));

		registry.add("spring.rabbitmq.host", rabbit::getHost);
		registry.add("spring.rabbitmq.port", rabbit::getAmqpPort);
		registry.add("spring.rabbitmq.username", rabbit::getAdminUsername);
		registry.add("spring.rabbitmq.password", rabbit::getAdminPassword);

		// avoid JWT secret placeholder failures in tests
		registry.add("app.jwt.secret", () -> "test-secret-key-change-me-12345678901234567890");
	}

	@LocalServerPort
	int port;

	@org.springframework.beans.factory.annotation.Autowired
	TestRestTemplate rest;

	@Test
	void fullFlow_register_login_createJob_statusCompletes() throws InterruptedException {
		String base = "http://localhost:" + port;
		String email = "e2e_" + System.currentTimeMillis() + "@example.com";
		String password = "Pass@123";

		// register
		String registerJson = "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
		Map<?, ?> registerResp = rest.postForObject(base + "/auth/register", jsonEntity(registerJson), Map.class);
		assertNotNull(registerResp);
		assertTrue(registerResp.containsKey("accessToken"));

		// login
		Map<?, ?> loginResp = rest.postForObject(base + "/auth/login", jsonEntity(registerJson), Map.class);
		assertNotNull(loginResp);
		String accessToken = (String) loginResp.get("accessToken");
		assertNotNull(accessToken);

		// create job
		String createJobJson = "{\"jobType\":\"summarize\",\"inputText\":\"hello from e2e\"}";
		Map<?, ?> createResp = rest.postForObject(
				base + "/api/jobs",
				authJsonEntity(accessToken, createJobJson),
				Map.class
		);
		assertNotNull(createResp);
		String jobId = (String) createResp.get("jobId");
		assertNotNull(jobId);

		// poll status until completed
		long deadline = System.currentTimeMillis() + 10_000;
		Map<?, ?> statusResp = null;
		while (System.currentTimeMillis() < deadline) {
			statusResp = rest.exchange(
					base + "/api/jobs/" + jobId,
					org.springframework.http.HttpMethod.GET,
					authJsonEntity(accessToken, null),
					Map.class
			).getBody();
			assertNotNull(statusResp);
			String status = (String) statusResp.get("status");
			if ("COMPLETED".equals(status)) break;
			Thread.sleep(100);
		}

		assertNotNull(statusResp);
		assertEquals("COMPLETED", statusResp.get("status"));
		assertNotNull(statusResp.get("result"));
	}

	private static HttpEntity<String> jsonEntity(String json) {
		HttpHeaders h = new HttpHeaders();
		h.setContentType(MediaType.APPLICATION_JSON);
		return new HttpEntity<>(json, h);
	}

	private static HttpEntity<String> authJsonEntity(String token, String json) {
		HttpHeaders h = new HttpHeaders();
		h.setContentType(MediaType.APPLICATION_JSON);
		h.set("Authorization", "Bearer " + token);
		return new HttpEntity<>(json, h);
	}

	/**
	 * Test-only worker simulation: consumes from RabbitMQ and writes status/result to Redis.
	 * This validates producer → queue → consumer → redis → status API.
	 */
	@TestConfiguration
	static class TestWorkerConfig {
		@Bean
		TestWorkerConsumer testWorkerConsumer(StringRedisTemplate redis) {
			return new TestWorkerConsumer(redis);
		}
	}

	static class TestWorkerConsumer {
		private final StringRedisTemplate redis;

		TestWorkerConsumer(StringRedisTemplate redis) {
			this.redis = redis;
		}

		@RabbitListener(queues = "ai.jobs.new")
		public void consume(String message) {
			String[] parts = message.split(":", 3);
			if (parts.length < 3) return;
			String jobId = parts[0];
			String jobType = parts[1];
			String inputText = parts[2];

			redis.opsForValue().set("job:status:" + jobId, "PROCESSING");
			redis.opsForValue().set("job:result:" + jobId, "Summary: " + inputText);
			redis.opsForValue().set("job:status:" + jobId, "COMPLETED");
			redis.opsForValue().set("job:updatedat:" + jobId, Instant.now().toString());
		}
	}
}
