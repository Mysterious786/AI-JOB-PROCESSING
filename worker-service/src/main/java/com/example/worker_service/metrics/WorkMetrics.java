package com.example.worker_service.metrics;


import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

@Component
public class WorkMetrics {

    private final Counter jobsReceived;
    private final Counter jobsSucceeded;
    private final Counter jobsFailed;
    private final Timer processingTimer;

    public WorkMetrics(MeterRegistry registry){
        this.jobsReceived = Counter.builder("worker.jobs.received")
                .description("Total jobs received from queue")
                .register(registry);
        this.jobsSucceeded = Counter.builder("worker.jobs.succeeded")
                .description("Jobs processed successfully")
                .register(registry);
        this.jobsFailed = Counter.builder("worker.jobs.failed")
                .description("Jobs that failed")
                .register(registry);
        this.processingTimer = Timer.builder("worker.jobs.processing.duration")
                .description("Time taken to process a job")
                .register(registry);
    }

    public void incrementReceived() { jobsReceived.increment(); }
    public void incrementSucceeded() { jobsSucceeded.increment(); }
    public void incrementFailed() { jobsFailed.increment(); }
    public Timer.Sample startTimer() { return Timer.start(); }
    public void stopTimer(Timer.Sample sample) { sample.stop(processingTimer); }

}
