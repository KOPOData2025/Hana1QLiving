package com.living.hana.controller;

import com.living.hana.dto.AiQueryRequest;
import com.living.hana.dto.AiQueryResponse;
import com.living.hana.dto.AiFeedbackRequest;
import com.living.hana.dto.AiFeedbackResponse;
import com.living.hana.dto.AiErrorResponse;
import com.living.hana.service.AiService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {
    
    private final AiService aiService;
    
    @PostMapping("/query")
    public ResponseEntity<?> processQuery(
            @Valid @RequestBody AiQueryRequest request,
            HttpServletRequest httpRequest) {
        
        String requestId = UUID.randomUUID().toString();
        
        try {
            // JWT 토큰 추출
            String authHeader = httpRequest.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                log.warn("인증 헤더 누락 또는 잘못된 형식 - requestId: {}", requestId);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new AiErrorResponse(requestId, "UNAUTHORIZED", "유효한 인증 토큰이 필요합니다"));
            }
            
            String jwtToken = authHeader.substring(7);
            
            // AI 쿼리 처리
            AiQueryResponse response = aiService.processQuery(request, jwtToken);
            response.setRequestId(requestId);
            
            log.info("AI 쿼리 처리 완료 - requestId: {}", requestId);
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            log.warn("유효성 검사 오류 - requestId: {}, error: {}", requestId, e.getMessage());
            return ResponseEntity.badRequest()
                .body(new AiErrorResponse(requestId, "VALIDATION_ERROR", e.getMessage()));
            
        } catch (RuntimeException e) {
            log.error("AI 쿼리 처리 중 오류 발생 - requestId: {}, error: {}", requestId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new AiErrorResponse(requestId, "INTERNAL_ERROR", "AI 쿼리 처리 중 오류가 발생했습니다"));
        }
    }
    
    @PostMapping("/feedback")
    public ResponseEntity<AiFeedbackResponse> processFeedback(
            @Valid @RequestBody AiFeedbackRequest request) {

        try {
            aiService.processFeedback(request);
            log.info("AI 피드백 처리 완료 - requestId: {}", request.getRequestId());
            return ResponseEntity.accepted().body(new AiFeedbackResponse(true));

        } catch (Exception e) {
            log.error("AI 피드백 처리 중 오류 발생 - requestId: {}, error: {}",
                    request.getRequestId(), e.getMessage(), e);
            return ResponseEntity.accepted().body(new AiFeedbackResponse(false));
        }
    }

    @PostMapping("/vector-sync")
    public ResponseEntity<?> manualVectorSync(HttpServletRequest httpRequest) {
        String requestId = UUID.randomUUID().toString();

        try {
            // JWT 토큰 추출
            String authHeader = httpRequest.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                log.warn("인증 헤더 누락 또는 잘못된 형식 - requestId: {}", requestId);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "유효한 인증 토큰이 필요합니다"));
            }

            String jwtToken = authHeader.substring(7);

            // 벡터DB 수동 동기화 실행
            boolean success = aiService.manualVectorSync(jwtToken);

            if (success) {
                log.info("벡터DB 수동 동기화 완료 - requestId: {}", requestId);
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "벡터DB 동기화가 완료되었습니다",
                    "requestId", requestId
                ));
            } else {
                log.warn("벡터DB 수동 동기화 실패 - requestId: {}", requestId);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                        "success", false,
                        "message", "벡터DB 동기화에 실패했습니다",
                        "requestId", requestId
                    ));
            }

        } catch (Exception e) {
            log.error("벡터DB 동기화 중 오류 발생 - requestId: {}, error: {}", requestId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(
                    "success", false,
                    "message", "벡터DB 동기화 중 오류가 발생했습니다",
                    "requestId", requestId
                ));
        }
    }
}
