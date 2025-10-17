package com.living.hana.controller;

import com.living.hana.dto.ExpenseRequest;
import com.living.hana.dto.ExpenseResponse;
import com.living.hana.dto.FinancialResponse;
import com.living.hana.dto.RevenueResponse;
import com.living.hana.entity.Expense;
import com.living.hana.entity.Payment;
import com.living.hana.service.ExpenseService;
import com.living.hana.service.FinancialService;
import com.living.hana.service.RevenueService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
public class FinancialController {

    private final FinancialService financialService;
    private final RevenueService revenueService;
    private final ExpenseService expenseService;

    /**
     * 수익 목록 조회 (전체/조건별)
     */
    @GetMapping("/api/revenues")
    public ResponseEntity<RevenueResponse> getAllRevenues(
            @RequestParam(required = false) Long buildingId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {

        log.info("수익 목록 조회 요청: buildingId={}, category={}, {} ~ {}",
                buildingId, category, startDate, endDate);

        try {
            List<Payment> revenues;

            if (buildingId != null || category != null || (startDate != null && endDate != null)) {
                revenues = revenueService.getRevenuesByConditions(buildingId, category, startDate, endDate);
            } else {
                revenues = revenueService.getAllRevenues();
            }

            return ResponseEntity.ok(RevenueResponse.success(revenues));
        } catch (Exception e) {
            log.error("수익 목록 조회 실패: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(RevenueResponse.error("수익 목록 조회에 실패했습니다: " + e.getMessage()));
        }
    }

    /**
     * 수익 목록 조회 (건물별)
     */
    @GetMapping("/api/revenues/building/{buildingId}")
    public ResponseEntity<RevenueResponse> getRevenuesByBuilding(@PathVariable Long buildingId) {
        log.info("건물별 수익 목록 조회 요청: buildingId={}", buildingId);

        try {
            List<Payment> revenues = revenueService.getRevenuesByBuilding(buildingId);
            return ResponseEntity.ok(RevenueResponse.success(revenues));
        } catch (Exception e) {
            log.error("건물별 수익 목록 조회 실패: buildingId={}, error={}", buildingId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(RevenueResponse.error("수익 목록 조회에 실패했습니다: " + e.getMessage()));
        }
    }

    // ========== 지출 관리 API (기존 ExpenseController 통합) ==========

    /**
     * 지출 등록
     */
    @PostMapping("/api/expenses")
    public ResponseEntity<ExpenseResponse> createExpense(@RequestBody ExpenseRequest request) {
        log.info("지출 등록 요청: {}", request);

        try {
            Expense expense = expenseService.createExpense(request);
            return ResponseEntity.ok(ExpenseResponse.success("지출이 등록되었습니다.", expense));
        } catch (Exception e) {
            log.error("지출 등록 실패: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ExpenseResponse.error("지출 등록에 실패했습니다: " + e.getMessage()));
        }
    }

    /**
     * 지출 조회 (ID)
     */
    @GetMapping("/api/expenses/{id}")
    public ResponseEntity<ExpenseResponse> getExpense(@PathVariable Long id) {
        log.info("지출 조회 요청: id={}", id);

        try {
            Expense expense = expenseService.getExpense(id);
            return ResponseEntity.ok(ExpenseResponse.success(expense));
        } catch (Exception e) {
            log.error("지출 조회 실패: id={}, error={}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ExpenseResponse.error("지출을 찾을 수 없습니다: " + e.getMessage()));
        }
    }

    /**
     * 지출 목록 조회 (전체/조건별)
     */
    @GetMapping("/api/expenses")
    public ResponseEntity<ExpenseResponse> getAllExpenses(
            @RequestParam(required = false) Long buildingId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {

        log.info("지출 목록 조회 요청: buildingId={}, category={}, {} ~ {}",
                buildingId, category, startDate, endDate);

        try {
            List<Expense> expenses;

            if (buildingId != null || category != null || (startDate != null && endDate != null)) {
                expenses = expenseService.getExpensesByConditions(buildingId, category, startDate, endDate);
            } else {
                expenses = expenseService.getAllExpenses();
            }

            return ResponseEntity.ok(ExpenseResponse.success(expenses));
        } catch (Exception e) {
            log.error("지출 목록 조회 실패: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ExpenseResponse.error("지출 목록 조회에 실패했습니다: " + e.getMessage()));
        }
    }

    /**
     * 지출 수정
     */
    @PutMapping("/api/expenses/{id}")
    public ResponseEntity<ExpenseResponse> updateExpense(@PathVariable Long id,
                                                        @RequestBody ExpenseRequest request) {
        log.info("지출 수정 요청: id={}, request={}", id, request);

        try {
            Expense expense = expenseService.updateExpense(id, request);
            return ResponseEntity.ok(ExpenseResponse.success("지출이 수정되었습니다.", expense));
        } catch (Exception e) {
            log.error("지출 수정 실패: id={}, error={}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ExpenseResponse.error("지출 수정에 실패했습니다: " + e.getMessage()));
        }
    }

    /**
     * 지출 삭제
     */
    @DeleteMapping("/api/expenses/{id}")
    public ResponseEntity<ExpenseResponse> deleteExpense(@PathVariable Long id) {
        log.info("지출 삭제 요청: id={}", id);

        try {
            expenseService.deleteExpense(id);
            return ResponseEntity.ok(ExpenseResponse.success("지출이 삭제되었습니다."));
        } catch (Exception e) {
            log.error("지출 삭제 실패: id={}, error={}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ExpenseResponse.error("지출 삭제에 실패했습니다: " + e.getMessage()));
        }
    }

    // ========== 재무 분석 API ==========

    /**
     * 통합 재무 대시보드 데이터 조회
     */
    @GetMapping("/api/financial/dashboard")
    public ResponseEntity<FinancialResponse> getFinancialDashboard(
            @RequestParam(required = false) Long buildingId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {

        log.info("재무 대시보드 조회 요청: buildingId={}, {} ~ {}", buildingId, startDate, endDate);

        try {
            FinancialResponse.FinancialDashboard dashboard =
                    financialService.getFinancialDashboard(buildingId, startDate, endDate);
            return ResponseEntity.ok(FinancialResponse.success(dashboard));
        } catch (Exception e) {
            log.error("재무 대시보드 조회 실패: error={}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(FinancialResponse.error("재무 대시보드 조회에 실패했습니다: " + e.getMessage()));
        }
    }

    /**
     * 간단한 재무 요약 정보 조회
     */
    @GetMapping("/api/financial/summary")
    public ResponseEntity<FinancialResponse> getFinancialSummary(
            @RequestParam(required = false) Long buildingId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {

        log.info("재무 요약 조회 요청: buildingId={}, {} ~ {}", buildingId, startDate, endDate);

        try {
            FinancialResponse.FinancialSummary summary =
                    financialService.getFinancialSummary(buildingId, startDate, endDate);
            return ResponseEntity.ok(FinancialResponse.success(summary));
        } catch (Exception e) {
            log.error("재무 요약 조회 실패: error={}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(FinancialResponse.error("재무 요약 조회에 실패했습니다: " + e.getMessage()));
        }
    }

    /**
     * 수익률 분석
     */
    @GetMapping("/api/financial/profitability")
    public ResponseEntity<FinancialResponse> getProfitabilityAnalysis(
            @RequestParam(required = false) Long buildingId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {

        log.info("수익률 분석 요청: buildingId={}, {} ~ {}", buildingId, startDate, endDate);

        try {
            Map<String, Object> analysis =
                    financialService.getProfitabilityAnalysis(buildingId, startDate, endDate);
            return ResponseEntity.ok(FinancialResponse.success(analysis));
        } catch (Exception e) {
            log.error("수익률 분석 실패: error={}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(FinancialResponse.error("수익률 분석에 실패했습니다: " + e.getMessage()));
        }
    }

    /**
     * 건물별 재무 현황 비교
     */
    @GetMapping("/api/financial/buildings/comparison")
    public ResponseEntity<FinancialResponse> getBuildingsComparison(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {

        log.info("건물별 재무 현황 비교 요청: {} ~ {}", startDate, endDate);

        try {
            // 전체 대시보드에서 건물별 데이터만 추출
            FinancialResponse.FinancialDashboard dashboard =
                    financialService.getFinancialDashboard(null, startDate, endDate);

            return ResponseEntity.ok(FinancialResponse.success(
                    "건물별 재무 현황 비교", dashboard.getBuildingData()));
        } catch (Exception e) {
            log.error("건물별 재무 현황 비교 실패: error={}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(FinancialResponse.error("건물별 재무 현황 비교에 실패했습니다: " + e.getMessage()));
        }
    }

    /**
     * 월별 손익 추이 분석
     */
    @GetMapping("/api/financial/monthly-trend")
    public ResponseEntity<FinancialResponse> getMonthlyTrend(
            @RequestParam(required = false) Long buildingId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {

        log.info("월별 손익 추이 분석 요청: buildingId={}, {} ~ {}", buildingId, startDate, endDate);

        try {
            FinancialResponse.FinancialDashboard dashboard =
                    financialService.getFinancialDashboard(buildingId, startDate, endDate);

            return ResponseEntity.ok(FinancialResponse.success(
                    "월별 손익 추이", dashboard.getMonthlyData()));
        } catch (Exception e) {
            log.error("월별 손익 추이 분석 실패: error={}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(FinancialResponse.error("월별 손익 추이 분석에 실패했습니다: " + e.getMessage()));
        }
    }
}