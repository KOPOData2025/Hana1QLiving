package com.hana.securities.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class DividendService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    /**
     * 특정 상품을 보유한 증권계좌 목록 조회
     */
    public List<Map<String, Object>> getAccountsByProduct(String productCode) {
        log.info("상품 보유 계좌 조회: {}", productCode);

        String sql = """
            SELECT DISTINCT sa.account_number, sa.user_ci, sa.account_name, sa.balance
            FROM securities_accounts sa
            JOIN orders o ON sa.account_number = o.customer_id
            WHERE o.product_id = ? AND o.status = 'COMPLETED' AND o.order_type = 'BUY'
            AND sa.status = 'ACTIVE'
            """;

        try {
            List<Map<String, Object>> accounts = jdbcTemplate.queryForList(sql, productCode);
            log.info("상품 {} 보유 계좌 수: {}", productCode, accounts.size());
            return accounts;

        } catch (Exception e) {
            log.error("상품별 계좌 조회 실패: {}", e.getMessage(), e);
            throw new RuntimeException("계좌 조회 실패: " + e.getMessage());
        }
    }

    /**
     * 증권계좌에 배당금 지급
     */
    @Transactional
    public boolean payDividend(String accountNumber, String productCode, Double amount, String description) {
        log.info("배당금 지급 시작: {} -> {}", accountNumber, amount);

        try {
            // 1. 계좌 존재 확인
            String checkAccountSql = "SELECT COUNT(*) FROM securities_accounts WHERE account_number = ? AND status = 'ACTIVE'";
            Integer accountCount = jdbcTemplate.queryForObject(checkAccountSql, Integer.class, accountNumber);

            if (accountCount == null || accountCount == 0) {
                log.error("존재하지 않거나 비활성화된 계좌: {}", accountNumber);
                return false;
            }

            // 2. 계좌 잔고 업데이트
            String updateBalanceSql = """
                UPDATE securities_accounts
                SET balance = balance + ?, last_transaction_date = ?
                WHERE account_number = ?
                """;

            int updatedRows = jdbcTemplate.update(updateBalanceSql,
                amount, LocalDateTime.now(), accountNumber);

            if (updatedRows == 0) {
                log.error("계좌 잔고 업데이트 실패: {}", accountNumber);
                return false;
            }

            // 3. 배당 거래 내역 기록 (transactions 테이블에 저장)
            try {
                String insertTransactionSql = """
                    INSERT INTO transactions (
                        account_number, transaction_type, product_code, product_name, amount, balance_after
                    ) VALUES (?, 'DIVIDEND', ?, ?, ?, (SELECT balance FROM securities_accounts WHERE account_number = ?))
                    """;

                jdbcTemplate.update(insertTransactionSql,
                    accountNumber, productCode,
                    description != null ? description : ("배당금 지급 - " + productCode),
                    amount, accountNumber);

            } catch (Exception e) {
                // transactions 테이블이 없을 수 있으므로 로그만 남기고 계속 진행
                log.warn("배당 거래 내역 기록 실패 (테이블 미존재 가능): {}", e.getMessage());
            }

            log.info("배당금 지급 완료: {} -> {}", accountNumber, amount);
            return true;

        } catch (Exception e) {
            log.error("배당금 지급 실패: {} -> {}", accountNumber, e.getMessage(), e);
            return false;
        }
    }

    /**
     * 계좌별 배당 수익 내역 조회 - transactions 테이블에서 조회
     */
    public List<Map<String, Object>> getDividendHistory(String userCi) {
        log.info("배당 내역 조회 - userCi: {}", userCi);

        try {
            // 1. userCi로 해당 사용자의 모든 계좌번호를 찾기
            String accountSql = """
                SELECT account_number FROM securities_accounts
                WHERE user_ci = ? AND status = 'ACTIVE'
                """;

            List<String> accountNumbers = jdbcTemplate.queryForList(accountSql, String.class, userCi);
            log.info("userCi {} 연결된 계좌 수: {}", userCi, accountNumbers.size());

            if (accountNumbers.isEmpty()) {
                log.warn("userCi {}에 연결된 활성 계좌가 없습니다", userCi);
                return new ArrayList<>();
            }

            // 2. 모든 계좌의 배당 내역 조회
            List<Map<String, Object>> allDividends = new ArrayList<>();

            for (String accountNumber : accountNumbers) {
                log.info("계좌 {} 배당 내역 조회 중", accountNumber);

                String dividendSql = """
                    SELECT
                        t.id,
                        t.account_number,
                        t.product_code,
                        t.product_name,
                        t.amount,
                        t.balance_after,
                        t.transaction_date as payment_date,
                        t.created_at
                    FROM transactions t
                    WHERE t.account_number = ? AND t.transaction_type = 'DIVIDEND'
                    ORDER BY t.transaction_date DESC, t.id DESC
                    """;

                List<Map<String, Object>> accountDividends = jdbcTemplate.queryForList(dividendSql, accountNumber);

                // 프론트엔드에서 기대하는 형태로 데이터 변환
                for (Map<String, Object> dividend : accountDividends) {
                    // SQL에서 가져온 payment_date 사용
                    Object paymentDateObj = dividend.get("PAYMENT_DATE");
                    java.util.Date paymentDate;

                    if (paymentDateObj instanceof java.sql.Date) {
                        paymentDate = new java.util.Date(((java.sql.Date) paymentDateObj).getTime());
                    } else if (paymentDateObj instanceof java.sql.Timestamp) {
                        paymentDate = new java.util.Date(((java.sql.Timestamp) paymentDateObj).getTime());
                    } else {
                        paymentDate = new java.util.Date(); // fallback
                    }

                    java.util.Calendar cal = java.util.Calendar.getInstance();
                    cal.setTime(paymentDate);

                    // camelCase 키로 추가 (프론트엔드 호환성)
                    dividend.put("paymentDate", paymentDate);
                    dividend.put("year", cal.get(java.util.Calendar.YEAR));
                    dividend.put("month", cal.get(java.util.Calendar.MONTH) + 1); // Calendar.MONTH는 0부터 시작
                    dividend.put("day", cal.get(java.util.Calendar.DAY_OF_MONTH));
                    dividend.put("dividendAmount", dividend.get("AMOUNT"));
                    dividend.put("productName", dividend.get("PRODUCT_NAME"));
                    dividend.put("productCode", dividend.get("PRODUCT_CODE"));
                    dividend.put("accountNumber", dividend.get("ACCOUNT_NUMBER"));

                    // 로그로 변환된 데이터 확인
                    log.info("변환된 배당 데이터: paymentDate={}, year={}, month={}, day={}, amount={}, productName={}",
                            paymentDate, dividend.get("year"), dividend.get("month"), dividend.get("day"),
                            dividend.get("dividendAmount"), dividend.get("productName"));
                }

                allDividends.addAll(accountDividends);

                log.info("계좌 {} 배당 내역: {} 건", accountNumber, accountDividends.size());
            }

            log.info("전체 배당 내역: {} 건", allDividends.size());

            // 디버깅을 위해 실제 조회된 데이터 로그 출력
            for (Map<String, Object> dividend : allDividends) {
                log.info("배당 데이터: {}", dividend);
            }

            return allDividends;

        } catch (Exception e) {
            log.error("배당 내역 조회 실패: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    /**
     * 전체 배당 통계 조회 - transactions 테이블에서 조회
     */
    public Map<String, Object> getDividendStatistics() {
        log.info("배당 통계 조회");

        try {
            // 기본 통계 - 실제 테이블 구조에 맞게 수정
            String totalAmountSql = "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE transaction_type = 'DIVIDEND'";
            String totalCountSql = "SELECT COUNT(*) FROM transactions WHERE transaction_type = 'DIVIDEND'";
            String uniqueAccountsSql = "SELECT COUNT(DISTINCT account_number) FROM transactions WHERE transaction_type = 'DIVIDEND'";

            BigDecimal totalAmount = jdbcTemplate.queryForObject(totalAmountSql, BigDecimal.class);
            Integer totalCount = jdbcTemplate.queryForObject(totalCountSql, Integer.class);
            Integer uniqueAccounts = jdbcTemplate.queryForObject(uniqueAccountsSql, Integer.class);

            return Map.of(
                "totalDividendAmount", totalAmount != null ? totalAmount : BigDecimal.ZERO,
                "totalTransactionCount", totalCount != null ? totalCount : 0,
                "uniqueAccountCount", uniqueAccounts != null ? uniqueAccounts : 0,
                "lastUpdated", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
            );

        } catch (Exception e) {
            log.warn("배당 통계 조회 실패: {}", e.getMessage(), e);
            return Map.of(
                "totalDividendAmount", BigDecimal.ZERO,
                "totalTransactionCount", 0,
                "uniqueAccountCount", 0,
                "lastUpdated", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
            );
        }
    }
}