package com.living.hana.service;

import com.living.hana.dto.AiQueryRequest;
import com.living.hana.dto.AiQueryResponse;
import com.living.hana.dto.AiFeedbackRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.ResourceAccessException;

import java.util.UUID;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiService {
    
    private final RestTemplate restTemplate;
    
    @Value("${ai.orchestrator.url}")
    private String orchestratorUrl;
    
    @Value("${ai.orchestrator.timeout:30000}")
    private int timeout;
    
    public AiQueryResponse processQuery(AiQueryRequest request, String jwtToken) {
        String requestId = UUID.randomUUID().toString();
        log.info("AI Query 시작 - requestId: {}, userInput: {}", requestId, request.getUserInput());
        
        try {
            // 오케스트레이터로 요청 전달
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + jwtToken);
            headers.set("Content-Type", "application/json");
            
            HttpEntity<AiQueryRequest> entity = new HttpEntity<>(request, headers);

            ResponseEntity<OrchestratorResponse> response = restTemplate.exchange(
                orchestratorUrl + "/v1/ask",
                HttpMethod.POST,
                entity,
                OrchestratorResponse.class
            );
            
            OrchestratorResponse orchestratorResponse = response.getBody();
            if (orchestratorResponse == null) {
                throw new RuntimeException("오케스트레이터 응답이 null입니다");
            }
            
            // 응답 매핑
            AiQueryResponse aiResponse = new AiQueryResponse();
            aiResponse.setRequestId(requestId);
            aiResponse.setRouteType(orchestratorResponse.getRoute());
            aiResponse.setAnswer(orchestratorResponse.getText());
            
            // 응답 데이터 직접 할당
            aiResponse.setCitations(orchestratorResponse.getCitations());
            aiResponse.setChartSpec(orchestratorResponse.getChartSpec());
            aiResponse.setFollowUps(orchestratorResponse.getFollowUps());
            aiResponse.setSafety(orchestratorResponse.getSafety());
            
            // 오케스트레이터 정보 매핑
            AiQueryResponse.Orchestrator orchestrator = new AiQueryResponse.Orchestrator();
            orchestrator.setId(orchestratorResponse.getId());
            orchestrator.setLatencyMs(orchestratorResponse.getMetrics().getLatencyMs());
            
            AiQueryResponse.ModelUsage modelUsage = new AiQueryResponse.ModelUsage();
            modelUsage.setInputTokens(orchestratorResponse.getMetrics().getTokens().getIn());
            modelUsage.setOutputTokens(orchestratorResponse.getMetrics().getTokens().getOut());
            orchestrator.setModelUsage(modelUsage);
            
            aiResponse.setOrchestrator(orchestrator);
            
            log.info("AI Query 완료 - requestId: {}, routeType: {}", requestId, aiResponse.getRouteType());
            return aiResponse;
            
        } catch (ResourceAccessException e) {
            log.error("오케스트레이터 연결 실패 - requestId: {}, error: {}", requestId, e.getMessage());
            throw new RuntimeException("오케스트레이터 서비스에 연결할 수 없습니다", e);
        } catch (Exception e) {
            log.error("AI Query 처리 중 오류 발생 - requestId: {}, error: {}", requestId, e.getMessage(), e);
            throw new RuntimeException("AI 쿼리 처리 중 오류가 발생했습니다", e);
        }
    }
    
    public void processFeedback(AiFeedbackRequest request) {
        log.info("AI 피드백 수신 - requestId: {}, rating: {}, categories: {}, comment: {}",
                request.getRequestId(), request.getRating(), request.getCategories(), request.getComment());

    }

    public boolean manualVectorSync(String jwtToken) {
        String requestId = UUID.randomUUID().toString();
        log.info("벡터DB 수동 동기화 시작 - requestId: {}", requestId);

        try {
            // AI_Orchestration 서버의 수동 동기화 API 호출
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + jwtToken);
            headers.set("Content-Type", "application/json");

            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                orchestratorUrl + "/vector-sync/manual",
                HttpMethod.POST,
                entity,
                String.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("벡터DB 수동 동기화 성공 - requestId: {}", requestId);
                return true;
            } else {
                log.error("벡터DB 수동 동기화 실패 - requestId: {}, status: {}", requestId, response.getStatusCode());
                return false;
            }

        } catch (ResourceAccessException e) {
            log.error("AI_Orchestration 서버 연결 실패 - requestId: {}, error: {}", requestId, e.getMessage());
            return false;
        } catch (Exception e) {
            log.error("벡터DB 수동 동기화 중 오류 발생 - requestId: {}, error: {}", requestId, e.getMessage(), e);
            return false;
        }
    }
    
    // 오케스트레이터 응답 DTO (내부 클래스)
    public static class OrchestratorResponse {
        private String id;
        private String route;
        private String text;
        private List<AiQueryResponse.Citation> citations;
        private Object chartSpec;
        private List<String> followUps;
        private AiQueryResponse.Safety safety;
        private Metrics metrics;
        
        // getters and setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        
        public String getRoute() { return route; }
        public void setRoute(String route) { this.route = route; }
        
        public String getText() { return text; }
        public void setText(String text) { this.text = text; }
        
        public List<AiQueryResponse.Citation> getCitations() { return citations; }
        public void setCitations(List<AiQueryResponse.Citation> citations) { this.citations = citations; }
        
        public Object getChartSpec() { return chartSpec; }
        public void setChartSpec(Object chartSpec) { this.chartSpec = chartSpec; }
        
        public List<String> getFollowUps() { return followUps; }
        public void setFollowUps(List<String> followUps) { this.followUps = followUps; }
        
        public AiQueryResponse.Safety getSafety() { return safety; }
        public void setSafety(AiQueryResponse.Safety safety) { this.safety = safety; }
        
        public Metrics getMetrics() { return metrics; }
        public void setMetrics(Metrics metrics) { this.metrics = metrics; }
        
        public static class Metrics {
            private Long latencyMs;
            private Tokens tokens;
            
            public Long getLatencyMs() { return latencyMs; }
            public void setLatencyMs(Long latencyMs) { this.latencyMs = latencyMs; }
            
            public Tokens getTokens() { return tokens; }
            public void setTokens(Tokens tokens) { this.tokens = tokens; }
            
            public static class Tokens {
                private Long in;
                private Long out;
                
                public Long getIn() { return in; }
                public void setIn(Long in) { this.in = in; }
                
                public Long getOut() { return out; }
                public void setOut(Long out) { this.out = out; }
            }
        }
    }
}
