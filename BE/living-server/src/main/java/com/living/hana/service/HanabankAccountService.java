package com.living.hana.service;

import com.living.hana.dto.AccountInfo;
import com.living.hana.dto.AccountListResponse;
import com.living.hana.dto.HanabankAccountResponse;
import com.living.hana.dto.TransactionHistoryResponse;
import com.living.hana.exception.HanabankApiException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class HanabankAccountService {

    private final RestTemplate restTemplate;
    
    // 고정된 유저CI
    private static final String FIXED_USER_CI = "HANA_20990621_M_61f728f7";
    
    @Value("${hanabank.dev.base-url}")
    private String hanabankDevUrl;

    
    /**
     * 하나은행 API 호출하여 계좌 정보 조회
     */
    @CircuitBreaker(name = "hanabankApi", fallbackMethod = "callHanabankAccountApiFallback")
    private List<AccountInfo> callHanabankAccountApi() {
        try {
            String url = hanabankDevUrl + "/customer/accounts/v1";
            log.info("하나은행 개발 서버 호출: URL={}, UserCI={}", url, FIXED_USER_CI);

            // 하나은행 API 호출 (ApiResponseDto 구조)
            var response = restTemplate.getForEntity(url, Map.class);

            log.info("하나은행 API 응답: {}", response.getBody());

            if (response.getBody() != null && Boolean.TRUE.equals(response.getBody().get("success"))) {
                Map<String, Object> responseBody = response.getBody();
                Map<String, Object> data = (Map<String, Object>) responseBody.get("data");

                if (data != null && Boolean.TRUE.equals(data.get("success"))) {
                    List<Map<String, Object>> accountMaps = (List<Map<String, Object>>) data.get("accounts");
                    log.info("하나은행 계좌 데이터: {}", accountMaps);

                    if (accountMaps != null) {
                        return accountMaps.stream()
                            .map(this::convertMapToAccountInfo)
                            .toList();
                    }
                }
            } else {
                log.warn("하나은행 API 응답이 실패했습니다: {}", response.getBody());
            }

            return List.of();

        } catch (ResourceAccessException e) {
            log.error("하나은행 API 연결 타임아웃/실패", e);
            throw new HanabankApiException("하나은행 API 호출 실패: 연결 타임아웃", e);
        } catch (Exception e) {
            log.error("하나은행 API 호출 중 오류 발생", e);
            throw new HanabankApiException("하나은행 API 호출 실패", e);
        }
    }

    /**
     * Circuit Breaker Fallback: 계좌 조회 실패 시
     */
    private List<AccountInfo> callHanabankAccountApiFallback(Exception e) {
        log.warn("Circuit Breaker 작동: 하나은행 API 호출 실패 - Fallback 실행", e);
        return List.of();
    }

    /**
     * Map을 AccountInfo로 변환
     */
    private AccountInfo convertMapToAccountInfo(Map<String, Object> accountMap) {
        return AccountInfo.builder()
            .accountNumber((String) accountMap.get("accountNumber"))
            .accountType((String) accountMap.get("accountType"))
            .accountName((String) accountMap.get("accountName"))
            .bankCode((String) accountMap.get("bankCode"))
            .bankName((String) accountMap.get("bankName"))
            .balance(accountMap.get("balance") != null ? Long.parseLong(accountMap.get("balance").toString()) : 0L)
            .currency((String) accountMap.get("currency"))
            .status((String) accountMap.get("status"))
            .lastTransactionDate((String) accountMap.get("lastTransactionDate"))
            .build();
    }

    /**
     * 계좌 거래내역 조회
     */
    @CircuitBreaker(name = "hanabankApi", fallbackMethod = "getAccountTransactionsFallback")
    public TransactionHistoryResponse getAccountTransactions(String accountNumber, Integer limit, Integer offset) {
        try {
            log.info("하나은행 거래내역 조회 시작: accountNumber={}, limit={}, offset={}", accountNumber, limit, offset);

            String url = hanabankDevUrl + "/customer/accounts/" + accountNumber + "/transactions";
            if (limit != null) {
                url += "?limit=" + limit;
                if (offset != null) {
                    url += "&offset=" + offset;
                }
            }

            log.info("하나은행 거래내역 API 호출: URL={}", url);

            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);

            log.info("하나은행 거래내역 API 응답: {}", response.getBody());

            if (response.getBody() != null && Boolean.TRUE.equals(response.getBody().get("success"))) {
                Map<String, Object> responseBody = response.getBody();
                List<Map<String, Object>> transactionMaps = (List<Map<String, Object>>) responseBody.get("data");

                if (transactionMaps != null) {
                    List<TransactionHistoryResponse.TransactionInfo> transactions = transactionMaps.stream()
                            .map(this::convertMapToTransactionInfo)
                            .toList();

                    log.info("하나은행 거래내역 조회 성공: 거래 수={}", transactions.size());

                    return TransactionHistoryResponse.builder()
                            .success(true)
                            .message("거래내역을 성공적으로 조회했습니다.")
                            .transactions(transactions)
                            .totalCount(transactions.size())
                            .build();
                }
            } else {
                log.warn("하나은행 거래내역 API 응답이 실패했습니다: {}", response.getBody());
            }

            return TransactionHistoryResponse.builder()
                    .success(false)
                    .message("거래내역 조회에 실패했습니다.")
                    .transactions(List.of())
                    .totalCount(0)
                    .build();

        } catch (ResourceAccessException e) {
            log.error("하나은행 거래내역 API 연결 타임아웃/실패", e);
            throw new HanabankApiException("하나은행 거래내역 API 호출 실패: 연결 타임아웃", e);
        } catch (Exception e) {
            log.error("하나은행 거래내역 조회 중 오류 발생", e);
            throw new HanabankApiException("하나은행 거래내역 API 호출 실패", e);
        }
    }

    /**
     * Circuit Breaker Fallback: 거래내역 조회 실패 시
     */
    private TransactionHistoryResponse getAccountTransactionsFallback(String accountNumber, Integer limit, Integer offset, Exception e) {
        log.warn("Circuit Breaker 작동: 하나은행 거래내역 조회 실패 - Fallback 실행 (accountNumber={})", accountNumber, e);
        return TransactionHistoryResponse.builder()
                .success(false)
                .message("하나은행 서비스 일시적 장애로 거래내역을 조회할 수 없습니다.")
                .transactions(List.of())
                .totalCount(0)
                .build();
    }

    /**
     * 최근 거래내역 조회
     */
    @CircuitBreaker(name = "hanabankApi", fallbackMethod = "getRecentTransactionsFallback")
    public TransactionHistoryResponse getRecentTransactions(String accountNumber, Integer limit) {
        try {
            log.info("하나은행 최근 거래내역 조회 시작: accountNumber={}, limit={}", accountNumber, limit);

            String url = hanabankDevUrl + "/customer/accounts/" + accountNumber + "/transactions/recent";
            if (limit != null) {
                url += "?limit=" + limit;
            }

            log.info("하나은행 최근 거래내역 API 호출: URL={}", url);

            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);

            log.info("하나은행 최근 거래내역 API 응답: {}", response.getBody());

            if (response.getBody() != null && Boolean.TRUE.equals(response.getBody().get("success"))) {
                Map<String, Object> responseBody = response.getBody();
                List<Map<String, Object>> transactionMaps = (List<Map<String, Object>>) responseBody.get("data");

                if (transactionMaps != null) {
                    List<TransactionHistoryResponse.TransactionInfo> transactions = transactionMaps.stream()
                            .map(this::convertMapToTransactionInfo)
                            .toList();

                    log.info("하나은행 최근 거래내역 조회 성공: 거래 수={}", transactions.size());

                    return TransactionHistoryResponse.builder()
                            .success(true)
                            .message("최근 거래내역을 성공적으로 조회했습니다.")
                            .transactions(transactions)
                            .totalCount(transactions.size())
                            .build();
                }
            } else {
                log.warn("하나은행 최근 거래내역 API 응답이 실패했습니다: {}", response.getBody());
            }

            return TransactionHistoryResponse.builder()
                    .success(false)
                    .message("최근 거래내역 조회에 실패했습니다.")
                    .transactions(List.of())
                    .totalCount(0)
                    .build();

        } catch (ResourceAccessException e) {
            log.error("하나은행 최근 거래내역 API 연결 타임아웃/실패", e);
            throw new HanabankApiException("하나은행 거래내역 API 호출 실패: 연결 타임아웃", e);
        } catch (Exception e) {
            log.error("하나은행 최근 거래내역 조회 중 오류 발생", e);
            throw new HanabankApiException("하나은행 거래내역 API 호출 실패", e);
        }
    }

    /**
     * Circuit Breaker Fallback: 최근 거래내역 조회 실패 시
     */
    private TransactionHistoryResponse getRecentTransactionsFallback(String accountNumber, Integer limit, Exception e) {
        log.warn("Circuit Breaker 작동: 하나은행 최근 거래내역 조회 실패 - Fallback 실행 (accountNumber={})", accountNumber, e);
        return TransactionHistoryResponse.builder()
                .success(false)
                .message("하나은행 서비스 일시적 장애로 거래내역을 조회할 수 없습니다. 잠시 후 다시 시도해주세요.")
                .transactions(List.of())
                .totalCount(0)
                .build();
    }

    /**
     * 카테고리별 거래내역 조회
     */
    @CircuitBreaker(name = "hanabankApi", fallbackMethod = "getTransactionsByCategoryFallback")
    public TransactionHistoryResponse getTransactionsByCategory(String accountNumber, String category, Integer limit, Integer offset) {
        try {
            log.info("하나은행 카테고리별 거래내역 조회 시작: accountNumber={}, category={}, limit={}, offset={}",
                    accountNumber, category, limit, offset);

            String url = hanabankDevUrl + "/customer/accounts/" + accountNumber + "/transactions/by-category";
            url += "?category=" + category;
            if (limit != null) {
                url += "&limit=" + limit;
                if (offset != null) {
                    url += "&offset=" + offset;
                }
            }

            log.info("하나은행 카테고리별 거래내역 API 호출: URL={}", url);

            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);

            log.info("하나은행 카테고리별 거래내역 API 응답: {}", response.getBody());

            if (response.getBody() != null && Boolean.TRUE.equals(response.getBody().get("success"))) {
                Map<String, Object> responseBody = response.getBody();
                List<Map<String, Object>> transactionMaps = (List<Map<String, Object>>) responseBody.get("data");

                if (transactionMaps != null) {
                    List<TransactionHistoryResponse.TransactionInfo> transactions = transactionMaps.stream()
                            .map(this::convertMapToTransactionInfo)
                            .toList();

                    log.info("하나은행 카테고리별 거래내역 조회 성공: 거래 수={}", transactions.size());

                    return TransactionHistoryResponse.builder()
                            .success(true)
                            .message(category + " 카테고리 거래내역을 성공적으로 조회했습니다.")
                            .transactions(transactions)
                            .totalCount(transactions.size())
                            .build();
                }
            } else {
                log.warn("하나은행 카테고리별 거래내역 API 응답이 실패했습니다: {}", response.getBody());
            }

            return TransactionHistoryResponse.builder()
                    .success(false)
                    .message("카테고리별 거래내역 조회에 실패했습니다.")
                    .transactions(List.of())
                    .totalCount(0)
                    .build();

        } catch (ResourceAccessException e) {
            log.error("하나은행 카테고리별 거래내역 API 연결 타임아웃/실패", e);
            throw new HanabankApiException("하나은행 거래내역 API 호출 실패: 연결 타임아웃", e);
        } catch (Exception e) {
            log.error("하나은행 카테고리별 거래내역 조회 중 오류 발생", e);
            throw new HanabankApiException("하나은행 거래내역 API 호출 실패", e);
        }
    }

    /**
     * Circuit Breaker Fallback: 카테고리별 거래내역 조회 실패 시
     */
    private TransactionHistoryResponse getTransactionsByCategoryFallback(String accountNumber, String category, Integer limit, Integer offset, Exception e) {
        log.warn("Circuit Breaker 작동: 하나은행 카테고리별 거래내역 조회 실패 - Fallback 실행 (accountNumber={})", accountNumber, e);
        return TransactionHistoryResponse.builder()
                .success(false)
                .message("하나은행 서비스 일시적 장애로 거래내역을 조회할 수 없습니다.")
                .transactions(List.of())
                .totalCount(0)
                .build();
    }

    /**
     * Map을 TransactionInfo로 변환
     */
    private TransactionHistoryResponse.TransactionInfo convertMapToTransactionInfo(Map<String, Object> transactionMap) {
        return TransactionHistoryResponse.TransactionInfo.builder()
                .id(transactionMap.get("id") != null ? Long.valueOf(transactionMap.get("id").toString()) : null)
                .accountNumber((String) transactionMap.get("accountNumber"))
                .transactionType((String) transactionMap.get("transactionType"))
                .amount(transactionMap.get("amount") != null ? new java.math.BigDecimal(transactionMap.get("amount").toString()) : null)
                .balanceBefore(transactionMap.get("balanceBefore") != null ? new java.math.BigDecimal(transactionMap.get("balanceBefore").toString()) : null)
                .balanceAfter(transactionMap.get("balanceAfter") != null ? new java.math.BigDecimal(transactionMap.get("balanceAfter").toString()) : null)
                .transactionId((String) transactionMap.get("transactionId"))
                .description((String) transactionMap.get("description"))
                .relatedAccount((String) transactionMap.get("relatedAccount"))
                .relatedBankCode((String) transactionMap.get("relatedBankCode"))
                .relatedBankName((String) transactionMap.get("relatedBankName"))
                .category((String) transactionMap.get("category"))
                .status((String) transactionMap.get("status"))
                .createdAt(transactionMap.get("createdAt") != null ? java.time.LocalDateTime.parse(transactionMap.get("createdAt").toString()) : null)
                .updatedAt(transactionMap.get("updatedAt") != null ? java.time.LocalDateTime.parse(transactionMap.get("updatedAt").toString()) : null)
                .build();
    }

}

