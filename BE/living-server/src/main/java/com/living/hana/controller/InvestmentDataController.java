package com.living.hana.controller;

import com.living.hana.entity.InvestmentTransaction;
import com.living.hana.entity.User;
import com.living.hana.service.InvestmentOrderService;
import com.living.hana.service.InvestmentTransactionService;
import com.living.hana.service.UserPortfolioService;
import com.living.hana.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/investment")
public class InvestmentDataController {

    @Autowired
    private InvestmentTransactionService investmentTransactionService;

    @Autowired
    private UserPortfolioService userPortfolioService;

    @Autowired
    private UserService userService;

    // ===== 거래내역 조회 엔드포인트 =====

    /**
     * JWT 토큰에서 사용자 정보를 자동으로 추출하여 거래내역 조회
     * GET /api/investment/transactions
     */
    @GetMapping("/transactions")
    public ResponseEntity<Map<String, Object>> getMyTransactions(HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String userCi = (String) request.getAttribute("userCi");

            if (userCi == null) {
                response.put("success", false);
                response.put("message", "인증 정보가 필요합니다.");
                return ResponseEntity.status(401).body(response);
            }

            List<InvestmentTransaction> transactions = investmentTransactionService.getUserTransactionsByUserCi(userCi);
            response.put("success", true);
            response.put("data", transactions);
            response.put("count", transactions.size());
            response.put("userCi", userCi);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("거래내역 조회 중 오류: {}", e.getMessage());
            response.put("success", false);
            response.put("message", "거래내역 조회 중 오류가 발생했습니다.");
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 매매 손익 조회
     * GET /api/investment/trading-profit-loss
     */
    @GetMapping("/trading-profit-loss")
    public ResponseEntity<Map<String, Object>> getTradingProfitLoss(HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Long userId = (Long) request.getAttribute("userId");

            if (userId == null) {
                response.put("success", false);
                response.put("message", "인증 정보가 필요합니다.");
                return ResponseEntity.status(401).body(response);
            }

            // 매매 손익 데이터 계산
            Map<String, Object> profitLossData = investmentTransactionService.calculateTradingProfitLoss(userId);

            response.put("success", true);
            response.put("data", profitLossData);
            response.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "매매 손익 조회 중 오류가 발생했습니다.");
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 배당 내역 조회
     * GET /api/investment/dividends
     */
    @GetMapping("/dividends")
    public ResponseEntity<Map<String, Object>> getDividends(HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Long userId = (Long) request.getAttribute("userId");
            String userCi = (String) request.getAttribute("userCi");

            if (userId == null) {
                response.put("success", false);
                response.put("message", "인증 정보가 필요합니다.");
                return ResponseEntity.status(401).body(response);
            }

            // 배당 내역 조회
            List<Map<String, Object>> dividendHistory = investmentTransactionService.getDividendHistory(userId);

            response.put("success", true);
            response.put("data", dividendHistory);
            response.put("count", dividendHistory.size());
            response.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("배당 내역 조회 중 오류: {}", e.getMessage());
            response.put("success", false);
            response.put("message", "배당 내역 조회 중 오류가 발생했습니다.");
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 배당 요약 정보 조회
     * GET /api/investment/dividends/summary
     */
    @GetMapping("/dividends/summary")
    public ResponseEntity<Map<String, Object>> getDividendSummary(HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Long userId = (Long) request.getAttribute("userId");

            if (userId == null) {
                response.put("success", false);
                response.put("message", "인증 정보가 필요합니다.");
                return ResponseEntity.status(401).body(response);
            }

            // 배당 요약 정보 조회
            Map<String, Object> dividendSummary = investmentTransactionService.getDividendSummary(userId);

            response.put("success", true);
            response.put("data", dividendSummary);
            response.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "배당 요약 정보 조회 중 오류가 발생했습니다.");
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // ===== 포트폴리오 조회 엔드포인트 =====

    /**
     * JWT 토큰에서 사용자 정보를 자동으로 추출하여 포트폴리오 요약 조회
     * GET /api/investment/portfolio/summary
     */
    @GetMapping("/portfolio/summary")
    public ResponseEntity<Map<String, Object>> getMyPortfolioSummary(HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Long userId = (Long) request.getAttribute("userId");

            if (userId == null) {
                response.put("success", false);
                response.put("message", "인증 정보가 필요합니다.");
                return ResponseEntity.status(401).body(response);
            }

            User user = userService.findById(userId);
            if (user == null || user.getUserCi() == null) {
                response.put("success", false);
                response.put("message", "사용자 정보를 찾을 수 없습니다.");
                return ResponseEntity.status(404).body(response);
            }

            // userCi 기반 포트폴리오 요약 조회 (주문 데이터 기반)
            Map<String, Object> summary = userPortfolioService.getPortfolioSummaryByUserCi(user.getUserCi());

            response.put("success", true);
            response.put("data", summary);
            response.put("userCi", user.getUserCi());
            response.put("userId", userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("포트폴리오 요약 조회 중 오류: {}", e.getMessage());
            response.put("success", false);
            response.put("message", "포트폴리오 요약 조회 중 오류가 발생했습니다.");
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * JWT 토큰에서 사용자 정보를 자동으로 추출하여 포트폴리오 조회
     * GET /api/investment/portfolio
     */
    @GetMapping("/portfolio")
    public ResponseEntity<Map<String, Object>> getMyPortfolio(HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Long userId = (Long) request.getAttribute("userId");

            if (userId == null) {
                response.put("success", false);
                response.put("message", "인증 정보가 필요합니다.");
                return ResponseEntity.status(401).body(response);
            }

            User user = userService.findById(userId);
            if (user == null || user.getUserCi() == null) {
                response.put("success", false);
                response.put("message", "사용자 정보를 찾을 수 없습니다.");
                return ResponseEntity.status(404).body(response);
            }

            // userCi 기반 포트폴리오 조회 (주문 데이터 기반)
            List<Map<String, Object>> portfolio = userPortfolioService.getUserPortfolioByUserCi(user.getUserCi());

            response.put("success", true);
            response.put("data", portfolio);
            response.put("count", portfolio.size());
            response.put("userCi", user.getUserCi());
            response.put("userId", userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("포트폴리오 조회 중 오류: {}", e.getMessage());
            response.put("success", false);
            response.put("message", "포트폴리오 조회 중 오류가 발생했습니다.");
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * JWT 토큰에서 사용자 ID를 자동으로 추출하여 포트폴리오 분석 조회
     * GET /api/investment/portfolio/analysis
     */
    @GetMapping("/portfolio/analysis")
    public ResponseEntity<Map<String, Object>> getMyPortfolioAnalysis(HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Long userId = (Long) request.getAttribute("userId");

            if (userId == null) {
                response.put("success", false);
                response.put("message", "인증 정보가 필요합니다.");
                return ResponseEntity.status(401).body(response);
            }

            User user = userService.findById(userId);
            if (user == null || user.getUserCi() == null) {
                response.put("success", false);
                response.put("message", "사용자 정보를 찾을 수 없습니다.");
                return ResponseEntity.status(404).body(response);
            }

            // userCi 기반 포트폴리오 분석 조회 (주문 데이터 기반)
            Map<String, Object> analysis = userPortfolioService.getPortfolioAnalysisByUserCi(user.getUserCi());

            response.put("success", true);
            response.put("data", analysis);
            response.put("userCi", user.getUserCi());
            response.put("userId", userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("포트폴리오 분석 중 오류: {}", e.getMessage());
            response.put("success", false);
            response.put("message", "포트폴리오 분석 중 오류가 발생했습니다.");
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}
