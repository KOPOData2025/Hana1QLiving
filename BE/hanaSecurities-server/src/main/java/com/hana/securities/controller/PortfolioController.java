package com.hana.securities.controller;

import com.hana.securities.entity.Portfolio;
import com.hana.securities.service.PortfolioService;
import com.hana.securities.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/portfolio")
public class PortfolioController {

    @Autowired
    private PortfolioService portfolioService;
    
    @Autowired
    private OrderService orderService;


    @GetMapping("/{userId}")
    public ResponseEntity<Map<String, Object>> getUserPortfolio(@PathVariable Long userId) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Portfolio> portfolioList = portfolioService.getUserPortfolio(userId);
            
            response.put("success", true);
            response.put("data", portfolioList);
            response.put("count", portfolioList.size());
            response.put("userId", userId);
            response.put("timestamp", System.currentTimeMillis());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "포트폴리오 조회 실패");
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/{userId}/summary")
    public ResponseEntity<Map<String, Object>> getPortfolioSummary(@PathVariable Long userId) {
        Map<String, Object> response = new HashMap<>();
        try {
            Map<String, Object> summary = portfolioService.getPortfolioSummary(userId);

            response.put("success", true);
            response.put("data", summary);
            response.put("userId", userId);
            response.put("timestamp", System.currentTimeMillis());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "포트폴리오 요약 조회 실패");
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/{userId}/analysis")
    public ResponseEntity<Map<String, Object>> getPortfolioAnalysis(@PathVariable Long userId) {
        Map<String, Object> response = new HashMap<>();
        try {
            Map<String, Object> analysis = portfolioService.getPortfolioAnalysis(userId);
            
            response.put("success", true);
            response.put("data", analysis);
            response.put("userId", userId);
            response.put("timestamp", System.currentTimeMillis());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "포트폴리오 분석 실패");
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/{userId}/refresh")
    public ResponseEntity<Map<String, Object>> refreshPortfolioValues(@PathVariable Long userId) {
        Map<String, Object> response = new HashMap<>();
        try {
            
            // 실제 포트폴리오 재생성 - userId를 customerId로 변환하여 호출
            String customerId = String.valueOf(userId);
            List<Map<String, Object>> refreshedPortfolio = portfolioService.generatePortfolioFromOrders(customerId);
            
            
            // 새로고침된 포트폴리오 요약도 생성
            Map<String, Object> refreshedSummary = portfolioService.generatePortfolioSummaryFromOrders(customerId);
            
            response.put("success", true);
            response.put("message", "포트폴리오가 최신 거래내역으로 새로고침되었습니다.");
            response.put("userId", userId);
            response.put("customerId", customerId);
            response.put("portfolioCount", refreshedPortfolio.size());
            response.put("timestamp", System.currentTimeMillis());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "포트폴리오 새로고침 실패");
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // userCi 기반 포트폴리오 조회 (주문 데이터를 기반으로 동적 생성)
    @GetMapping("/customer/{customerId}")
    public ResponseEntity<Map<String, Object>> getPortfolioByCustomerId(@PathVariable String customerId) {
        Map<String, Object> response = new HashMap<>();
        try {
            // 주문 데이터를 기반으로 포트폴리오 생성
            List<Map<String, Object>> portfolio = portfolioService.generatePortfolioFromOrders(customerId);
            
            response.put("success", true);
            response.put("data", portfolio);
            response.put("count", portfolio.size());
            response.put("customerId", customerId);
            response.put("timestamp", System.currentTimeMillis());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "포트폴리오 조회 실패");
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // userCi 기반 포트폴리오 요약 조회 (총 평가금액 등 포함)
    @GetMapping("/customer/{customerId}/summary")
    public ResponseEntity<Map<String, Object>> getPortfolioSummaryByCustomerId(@PathVariable String customerId) {
        Map<String, Object> response = new HashMap<>();
        try {
            // 주문 데이터를 기반으로 포트폴리오 요약 생성
            Map<String, Object> summary = portfolioService.generatePortfolioSummaryFromOrders(customerId);
            
            response.put("success", true);
            response.put("data", summary);
            response.put("customerId", customerId);
            response.put("timestamp", System.currentTimeMillis());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "포트폴리오 요약 조회 실패");
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // userCi 기반 포트폴리오 분석 조회
    @GetMapping("/customer/{customerId}/analysis")
    public ResponseEntity<Map<String, Object>> getPortfolioAnalysisByCustomerId(@PathVariable String customerId) {
        Map<String, Object> response = new HashMap<>();
        try {
            // 주문 데이터를 기반으로 포트폴리오 분석 생성
            Map<String, Object> analysis = portfolioService.generatePortfolioAnalysisFromOrders(customerId);
            
            response.put("success", true);
            response.put("data", analysis);
            response.put("customerId", customerId);
            response.put("timestamp", System.currentTimeMillis());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "포트폴리오 분석 조회 실패");
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

}