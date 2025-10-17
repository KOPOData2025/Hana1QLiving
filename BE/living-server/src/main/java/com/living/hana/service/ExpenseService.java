package com.living.hana.service;

import com.living.hana.dto.ExpenseRequest;
import com.living.hana.dto.ExpenseResponse;
import com.living.hana.entity.Expense;
import com.living.hana.mapper.ExpenseMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseMapper expenseMapper;

    /**
     * 지출 등록
     */
    @Transactional
    public Expense createExpense(ExpenseRequest request) {
        log.info("지출 등록 시작: category={}, amount={}", request.getCategory(), request.getAmount());

        try {
            Expense expense = Expense.builder()
                    .category(request.getCategory())
                    .description(request.getDescription())
                    .amount(request.getAmount())
                    .expenseDate(request.getExpenseDate() != null ? request.getExpenseDate() :
                            LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")))
                    .buildingId(request.getBuildingId())
                    .createdBy(request.getCreatedBy())
                    .build();

            expenseMapper.insert(expense);
            log.info("지출 등록 완료: id={}", expense.getId());

            return expense;
        } catch (Exception e) {
            log.error("지출 등록 실패: {}", e.getMessage(), e);
            throw new RuntimeException("지출 등록에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 지출 조회 (ID)
     */
    public Expense getExpense(Long id) {

        Expense expense = expenseMapper.findById(id);
        if (expense == null) {
            throw new RuntimeException("지출을 찾을 수 없습니다: id=" + id);
        }

        return expense;
    }

    /**
     * 지출 목록 조회 (전체)
     */
    public List<Expense> getAllExpenses() {
        return expenseMapper.findAll();
    }

    /**
     * 지출 목록 조회 (건물별)
     */
    public List<Expense> getExpensesByBuilding(Long buildingId) {
        return expenseMapper.findByBuildingId(buildingId);
    }

    /**
     * 지출 목록 조회 (카테고리별)
     */
    public List<Expense> getExpensesByCategory(String category) {
        return expenseMapper.findByCategory(category);
    }

    /**
     * 지출 목록 조회 (복합 조건)
     */
    public List<Expense> getExpensesByConditions(Long buildingId, String category, String startDate, String endDate) {
        return expenseMapper.findByConditions(buildingId, category, startDate, endDate);
    }

    /**
     * 지출 수정
     */
    @Transactional
    public Expense updateExpense(Long id, ExpenseRequest request) {
        log.info("지출 수정: id={}", id);

        try {
            Expense existingExpense = getExpense(id);

            Expense updatedExpense = Expense.builder()
                    .id(existingExpense.getId())
                    .category(request.getCategory() != null ? request.getCategory() : existingExpense.getCategory())
                    .description(request.getDescription() != null ? request.getDescription() : existingExpense.getDescription())
                    .amount(request.getAmount() != null ? request.getAmount() : existingExpense.getAmount())
                    .expenseDate(request.getExpenseDate() != null ? request.getExpenseDate() : existingExpense.getExpenseDate())
                    .buildingId(request.getBuildingId() != null ? request.getBuildingId() : existingExpense.getBuildingId())
                    .createdBy(existingExpense.getCreatedBy())
                    .createdAt(existingExpense.getCreatedAt())
                    .build();

            expenseMapper.update(updatedExpense);
            log.info("지출 수정 완료: id={}", id);

            return getExpense(id);
        } catch (Exception e) {
            log.error("지출 수정 실패: id={}, error={}", id, e.getMessage(), e);
            throw new RuntimeException("지출 수정에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 지출 삭제
     */
    @Transactional
    public void deleteExpense(Long id) {
        log.info("지출 삭제: id={}", id);

        try {
            // 지출 존재 여부 확인
            getExpense(id);

            expenseMapper.deleteById(id);
            log.info("지출 삭제 완료: id={}", id);
        } catch (Exception e) {
            log.error("지출 삭제 실패: id={}, error={}", id, e.getMessage(), e);
            throw new RuntimeException("지출 삭제에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 지출 통계 조회
     */
    public ExpenseResponse.ExpenseStatistics getExpenseStatistics(Long buildingId, String startDate, String endDate) {
        log.info("지출 통계 조회: buildingId={}, {} ~ {}", buildingId, startDate, endDate);

        try {
            // 총 금액 및 건수
            BigDecimal totalAmount;
            long totalCount;

            if (buildingId != null) {
                totalAmount = expenseMapper.getTotalAmountByBuildingId(buildingId);
                totalCount = expenseMapper.countByBuildingId(buildingId);
            } else {
                totalAmount = expenseMapper.getTotalAmount();
                totalCount = expenseMapper.countAll();
            }

            // 카테고리별 통계
            var categories = expenseMapper.getCategorySummary(buildingId, startDate, endDate);

            // 비율 계산
            if (totalAmount.compareTo(BigDecimal.ZERO) > 0) {
                categories.forEach(category -> {
                    double percentage = category.getAmount()
                            .divide(totalAmount, 4, RoundingMode.HALF_UP)
                            .multiply(BigDecimal.valueOf(100))
                            .doubleValue();
                    category.setPercentage(percentage);
                });
            }

            // 월별 통계
            var monthly = expenseMapper.getMonthlySummary(buildingId, startDate, endDate);

            return ExpenseResponse.ExpenseStatistics.builder()
                    .totalAmount(totalAmount)
                    .totalCount(totalCount)
                    .categories(categories)
                    .monthly(monthly)
                    .build();

        } catch (Exception e) {
            log.error("지출 통계 조회 실패: error={}", e.getMessage(), e);
            throw new RuntimeException("지출 통계 조회에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 전체 지출 건수
     */
    public long getTotalExpenseCount() {
        return expenseMapper.countAll();
    }

    /**
     * 카테고리별 지출 건수
     */
    public long getExpenseCountByCategory(String category) {
        return expenseMapper.countByCategory(category);
    }
}