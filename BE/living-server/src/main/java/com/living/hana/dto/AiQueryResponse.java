package com.living.hana.dto;

import lombok.Data;

import java.util.List;

@Data
public class AiQueryResponse {
    
    private String requestId;
    private String routeType; // BASIC, DATA
    private String answer;
    private List<Citation> citations;
    private Object chartSpec;
    private List<String> followUps;
    private Safety safety;
    private Orchestrator orchestrator;
    
    @Data
    public static class Citation {
        private String title;
        private String url;
        private String sourceType; // FAQ, TERM, CONF, BQ, OTHER
    }
    
    @Data
    public static class Safety {
        private Boolean allowed;
        private String reason;
    }
    
    @Data
    public static class Orchestrator {
        private String id;
        private Long latencyMs;
        private ModelUsage modelUsage;
    }
    
    @Data
    public static class ModelUsage {
        private Long inputTokens;
        private Long outputTokens;
    }
}
