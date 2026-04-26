package com.example.demo.config;

public class UpstreamProperties {
    private String coreService;
    private String workerService;

    public String getCoreService() {
        return coreService;
    }

    public void setCoreService(String coreService) {
        this.coreService = coreService;
    }

    public String getWorkerService() {
        return workerService;
    }

    public void setWorkerService(String workerService) {
        this.workerService = workerService;
    }
}
