package com.living.hana.service;

import com.living.hana.annotation.Logging;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class DividendService {

    private final JdbcTemplate jdbcTemplate;

    /**
     * 상품별 배당 정보 조회
     */
    @Logging(operation = "배당 정보 조회", category = "REIT")
    public List<Map<String, Object>> getProductDividends(String productCode) {

        String sql = """
            SELECT
                DIVIDEND_ID,
                PRODUCT_CODE,
                DIVIDEND_YEAR,
                DIVIDEND_QUARTER,
                DIVIDEND_RATE as ORIGINAL_RATE,
                DIVIDEND_AMOUNT,
                BASE_PRICE,
                RECORD_DATE,
                PAYMENT_DATE,
                ANNOUNCEMENT_DATE,
                CREATED_AT,
                TO_CHAR(RECORD_DATE, 'YYYY-MM-DD') as RECORD_DATE_STR,
                TO_CHAR(PAYMENT_DATE, 'YYYY-MM-DD') as PAYMENT_DATE_STR,
                TO_CHAR(ANNOUNCEMENT_DATE, 'YYYY-MM-DD') as ANNOUNCEMENT_DATE_STR,
                CASE
                    WHEN DIVIDEND_QUARTER = 1 THEN DIVIDEND_YEAR || '년 1분기'
                    WHEN DIVIDEND_QUARTER = 2 THEN DIVIDEND_YEAR || '년 2분기'
                    WHEN DIVIDEND_QUARTER = 3 THEN DIVIDEND_YEAR || '년 3분기'
                    WHEN DIVIDEND_QUARTER = 4 THEN DIVIDEND_YEAR || '년 4분기'
                    ELSE DIVIDEND_YEAR || '년'
                END as QUARTER_LABEL,
                CASE
                    WHEN BASE_PRICE IS NOT NULL AND BASE_PRICE > 0 THEN
                        ROUND((DIVIDEND_AMOUNT / BASE_PRICE) * 100, 4)
                    ELSE
                        COALESCE(DIVIDEND_RATE * 100, 0)
                END as CALCULATED_YIELD_PERCENT
            FROM reit_dividends
            WHERE PRODUCT_CODE = ?
            ORDER BY DIVIDEND_YEAR DESC, DIVIDEND_QUARTER DESC
            """;

        try {
            List<Map<String, Object>> results = jdbcTemplate.queryForList(sql, productCode);
            log.info("배당 정보 조회 완료 - 상품코드: {}, 건수: {}", productCode, results.size());

            return results;

        } catch (Exception e) {
            log.error("배당 정보 조회 실패 - 상품코드: {}, 에러: {}", productCode, e.getMessage(), e);
            throw new RuntimeException("배당 정보 조회 실패: " + e.getMessage(), e);
        }
    }
}