package com.living.hana.client;

import com.living.hana.dto.HanaBankAccountDto;
import com.living.hana.dto.AutoTransferRequest;
import com.living.hana.dto.AutoTransferResponse;
import com.living.hana.dto.AutoTransferContractInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class HanaBankClient {
    
    private final RestTemplate restTemplate;
    
    @Value("${hanabank.api.base-url:http://localhost:8090}")
    private String hanaBankUrl;
    
    /**
     * 하나은행에서 특정 계좌 정보 조회
     */
    public HanaBankAccountDto getAccountInfo(String accountNumber) {
        try {
            String url = hanaBankUrl + "/customer/accounts/info/" + accountNumber;
            log.info("하나은행 계좌 정보 조회 요청: {}", url);
            
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            Map<String, Object> responseBody = response.getBody();
            log.info("하나은행 응답: {}", responseBody);
            
            if (responseBody != null && responseBody.get("data") != null) {
                Map<String, Object> accountData = (Map<String, Object>) responseBody.get("data");
                
                // BigDecimal balance를 Long으로 변환
                Object balanceObj = accountData.get("balance");
                Long balance = 0L;
                if (balanceObj != null) {
                    if (balanceObj instanceof Number) {
                        balance = ((Number) balanceObj).longValue();
                    } else {
                        balance = Long.valueOf(balanceObj.toString().split("\\.")[0]); // 소수점 제거
                    }
                }

                return HanaBankAccountDto.builder()
                        .accountNumber((String) accountData.get("accountNumber"))
                        .accountName((String) accountData.get("accountName"))
                        .accountType((String) accountData.get("accountType"))
                        .balance(balance)
                        .bankCode("088")
                        .bankName("하나은행")
                        .currency("KRW")
                        .status((String) accountData.get("status"))
                        .build();
            }
            
            return null;
            
        } catch (Exception e) {
            log.error("하나은행 계좌 정보 조회 실패: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * 하나은행에서 사용자의 모든 계좌 목록 조회 (연동 검증용)
     */
    @SuppressWarnings("unchecked")
    public List<HanaBankAccountDto> getAllAccountsByUserCi(String userCi) {
        try {
            // 하나은행 API는 고정된 userCi를 사용하므로 파라미터 없이 호출
            String url = hanaBankUrl + "/customer/accounts/v1";
            log.info("하나은행 전체 계좌 목록 조회 요청: {}", url);
            
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            Map<String, Object> responseBody = response.getBody();
            log.info("하나은행 전체 계좌 응답: {}", responseBody);
            
            if (responseBody != null && responseBody.get("data") != null) {
                // ApiResponseDto.data가 AccountsResponseDto 형태
                Map<String, Object> accountsResponse = (Map<String, Object>) responseBody.get("data");
                List<Map<String, Object>> accounts = (List<Map<String, Object>>) accountsResponse.get("accounts");
                
                return accounts.stream()
                        .map(accountData -> {
                            // BigDecimal balance를 Long으로 변환
                            Object balanceObj = accountData.get("balance");
                            Long balance = 0L;
                            if (balanceObj != null) {
                                if (balanceObj instanceof Number) {
                                    balance = ((Number) balanceObj).longValue();
                                } else {
                                    balance = Long.valueOf(balanceObj.toString().split("\\.")[0]); // 소수점 제거
                                }
                            }
                            
                            return HanaBankAccountDto.builder()
                                .accountNumber((String) accountData.get("accountNumber"))
                                .accountName((String) accountData.get("accountName"))
                                .accountType((String) accountData.get("accountType"))
                                .balance(balance)
                                .bankCode("088")
                                .bankName("하나은행")
                                .currency("KRW")
                                .status((String) accountData.get("status"))
                                .build();
                        })
                        .collect(Collectors.toList());
            }
            
            return Collections.emptyList();
            
        } catch (Exception e) {
            log.error("하나은행 계좌 목록 조회 실패: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
    
    /**
     * 계좌 유효성 검증 (계좌번호와 사용자 CI 매칭 확인)
     */
    public boolean validateAccount(String accountNumber, String userCi) {
        try {
            HanaBankAccountDto account = getAccountInfo(accountNumber);
            return account != null && account.getStatus().equals("ACTIVE");
        } catch (Exception e) {
            log.error("계좌 유효성 검증 실패: {}", e.getMessage());
            return false;
        }
    }
    
    // === 자동이체 관련 메소드들 ===
    
    /**
     * 자동이체 계약 등록
     */
    public AutoTransferResponse registerAutoTransfer(AutoTransferRequest request, String userCi) {
        try {
            String url = hanaBankUrl + "/api/auto-payments/register";
            log.info("자동이체 등록 요청: {}", url);
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json");
            headers.set("X-User-CI", userCi);
            
            HttpEntity<AutoTransferRequest> entity = new HttpEntity<>(request, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            Map<String, Object> responseBody = response.getBody();
            
            log.info("자동이체 등록 응답: {}", responseBody);
            
            if (responseBody != null && Boolean.TRUE.equals(responseBody.get("success"))) {
                Map<String, Object> data = (Map<String, Object>) responseBody.get("data");
                return convertToAutoTransferResponse(data);
            }
            
            return null;
            
        } catch (Exception e) {
            log.error("자동이체 등록 실패: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * 자동이체 계약 해지
     */
    public boolean cancelAutoTransfer(Long contractId, String userCi) {
        try {
            String url = hanaBankUrl + "/api/auto-payments/" + contractId;
            log.info("자동이체 해지 요청: {}", url);
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-User-CI", userCi);
            
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.DELETE, entity, Map.class);
            Map<String, Object> responseBody = response.getBody();
            
            log.info("자동이체 해지 응답: {}", responseBody);
            
            return responseBody != null && Boolean.TRUE.equals(responseBody.get("success"));
            
        } catch (Exception e) {
            log.error("자동이체 해지 실패: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * 자동이체 계약 목록 조회
     */
    @SuppressWarnings("unchecked")
    public List<AutoTransferContractInfo> getAutoTransferContracts(String userCi, boolean activeOnly) {
        try {
            String url = hanaBankUrl + "/api/auto-payments/contracts?activeOnly=" + activeOnly;
            log.info("자동이체 계약 목록 조회 요청: {}", url);
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-User-CI", userCi);
            
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            Map<String, Object> responseBody = response.getBody();
            
            log.info("자동이체 계약 목록 응답: {}", responseBody);
            
            if (responseBody != null && Boolean.TRUE.equals(responseBody.get("success"))) {
                List<Map<String, Object>> contracts = (List<Map<String, Object>>) responseBody.get("data");
                return contracts.stream()
                        .map(this::convertToAutoTransferContractInfo)
                        .collect(Collectors.toList());
            }
            
            return Collections.emptyList();
            
        } catch (Exception e) {
            log.error("자동이체 계약 목록 조회 실패: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
    
    /**
     * 자동이체 계약 상세 조회
     */
    public AutoTransferContractInfo getAutoTransferContract(Long contractId, String userCi) {
        try {
            String url = hanaBankUrl + "/api/auto-payments/contracts/" + contractId;
            log.info("자동이체 계약 상세 조회 요청: {}", url);
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-User-CI", userCi);
            
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            Map<String, Object> responseBody = response.getBody();
            
            log.info("자동이체 계약 상세 응답: {}", responseBody);
            
            if (responseBody != null && Boolean.TRUE.equals(responseBody.get("success"))) {
                Map<String, Object> data = (Map<String, Object>) responseBody.get("data");
                return convertToAutoTransferContractInfo(data);
            }
            
            return null;
            
        } catch (Exception e) {
            log.error("자동이체 계약 상세 조회 실패: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * 자동이체 일시정지
     */
    public boolean suspendAutoTransfer(Long contractId, String userCi) {
        try {
            String url = hanaBankUrl + "/api/auto-payments/" + contractId + "/suspend";
            log.info("자동이체 일시정지 요청: {}", url);
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-User-CI", userCi);
            
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.PUT, entity, Map.class);
            Map<String, Object> responseBody = response.getBody();
            
            log.info("자동이체 일시정지 응답: {}", responseBody);
            
            return responseBody != null && Boolean.TRUE.equals(responseBody.get("success"));
            
        } catch (Exception e) {
            log.error("자동이체 일시정지 실패: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * 자동이체 재개
     */
    public boolean resumeAutoTransfer(Long contractId, String userCi) {
        try {
            String url = hanaBankUrl + "/api/auto-payments/" + contractId + "/resume";
            log.info("자동이체 재개 요청: {}", url);
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-User-CI", userCi);
            
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.PUT, entity, Map.class);
            Map<String, Object> responseBody = response.getBody();
            
            log.info("자동이체 재개 응답: {}", responseBody);
            
            return responseBody != null && Boolean.TRUE.equals(responseBody.get("success"));
            
        } catch (Exception e) {
            log.error("자동이체 재개 실패: {}", e.getMessage());
            return false;
        }
    }

    /**
     * 즉시 이체 실행 (관리비 등 즉시 처리용)
     */
    public AutoTransferResponse executeImmediateTransfer(AutoTransferRequest request, String userCi) {
        try {
            String url = hanaBankUrl + "/api/auto-payments/immediate-transfer";
            log.info("즉시 이체 실행 요청: {}", url);

            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json");
            headers.set("X-User-CI", userCi);

            HttpEntity<AutoTransferRequest> entity = new HttpEntity<>(request, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            Map<String, Object> responseBody = response.getBody();

            log.info("즉시 이체 실행 응답: {}", responseBody);

            if (responseBody != null && Boolean.TRUE.equals(responseBody.get("success"))) {
                Map<String, Object> data = (Map<String, Object>) responseBody.get("data");
                return convertToAutoTransferResponse(data);
            }

            return null;

        } catch (Exception e) {
            log.error("즉시 이체 실행 실패: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 하나은행 API 서비스 상태 확인
     */
    public boolean checkHealth() {
        try {
            String url = hanaBankUrl + "/actuator/health";
            log.info("하나은행 서비스 상태 확인 요청: {}", url);
            
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            Map<String, Object> responseBody = response.getBody();
            
            if (responseBody != null) {
                String status = (String) responseBody.get("status");
                boolean healthy = "UP".equals(status);
                log.info("하나은행 서비스 상태: {}", status);
                return healthy;
            }
            
            return false;
            
        } catch (Exception e) {
            log.error("하나은행 서비스 상태 확인 실패: {}", e.getMessage());
            return false;
        }
    }
    
    // === 변환 헬퍼 메소드들 ===
    
    private AutoTransferResponse convertToAutoTransferResponse(Map<String, Object> data) {
        return AutoTransferResponse.builder()
                .contractId(data.get("contractId") != null ? ((Number) data.get("contractId")).longValue() : null)
                .fromAccount((String) data.get("fromAccount"))
                .toAccount((String) data.get("toAccount"))
                .toBankCode((String) data.get("toBankCode"))
                .toBankName((String) data.get("toBankName"))
                .amount(data.get("amount") != null ? new java.math.BigDecimal(data.get("amount").toString()) : null)
                .transferDay((Integer) data.get("transferDay"))
                .beneficiaryName((String) data.get("beneficiaryName"))
                .memo((String) data.get("memo"))
                .status((String) data.get("status"))
                .transactionId((String) data.get("transactionId"))
                .success((Boolean) data.get("success"))
                .build();
    }
    
    private AutoTransferContractInfo convertToAutoTransferContractInfo(Map<String, Object> data) {
        // 날짜 파싱 헬퍼
        LocalDate nextTransferDate = null;
        LocalDateTime lastExecutionDate = null;
        LocalDateTime createdAt = null;
        LocalDateTime updatedAt = null;
        
        // 날짜 데이터 파싱
        try {
            if (data.get("nextTransferDate") != null) {
                nextTransferDate = parseDateFromOracle(data.get("nextTransferDate").toString(), true);
            }
            if (data.get("lastExecutionDate") != null) {
                lastExecutionDate = parseDateTimeFromOracle(data.get("lastExecutionDate").toString());
            }
            if (data.get("createdAt") != null) {
                createdAt = parseDateTimeFromOracle(data.get("createdAt").toString());
            }
            if (data.get("updatedAt") != null) {
                updatedAt = parseDateTimeFromOracle(data.get("updatedAt").toString());
            }
        } catch (Exception e) {
            log.warn("날짜 파싱 오류: {}", e.getMessage());
        }
        

        return AutoTransferContractInfo.builder()
                .id(((Number) data.get("id")).longValue())
                .userCi((String) data.get("userCi"))
                .fromAccount((String) data.get("fromAccount"))
                .toAccount((String) data.get("toAccount"))
                .toBankCode((String) data.get("toBankCode"))
                .toBankName((String) data.get("toBankName"))
                .amount(new java.math.BigDecimal(data.get("amount").toString()))
                .transferDay((Integer) data.get("transferDay"))
                .beneficiaryName((String) data.get("beneficiaryName"))
                .memo((String) data.get("memo"))
                .status((String) data.get("status"))
                .nextTransferDate(nextTransferDate)
                .totalExecutions(data.get("totalExecutions") != null ? ((Number) data.get("totalExecutions")).longValue() : 0L)
                .successfulExecutions(data.get("successfulExecutions") != null ? ((Number) data.get("successfulExecutions")).longValue() : 0L)
                .failedExecutions(data.get("failedExecutions") != null ? ((Number) data.get("failedExecutions")).longValue() : 0L)
                .lastExecutionDate(lastExecutionDate)
                .createdAt(createdAt)
                .updatedAt(updatedAt)
                .build();
    }

    /**
     * 날짜 문자열을 LocalDate로 파싱 (여러 형식 지원)
     * @param dateStr 날짜 문자열
     * @param isDate 날짜만 파싱할지 여부ll
     * @return LocalDate 객체
     */
    private LocalDate parseDateFromOracle(String dateStr, boolean isDate) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return null;
        }
        
        String trimmed = dateStr.trim();
        
        try {
            // ISO 형식 처리 (2025-10-10)
            if (trimmed.contains("-")) {
                return LocalDate.parse(trimmed);
            }
            
            // Oracle DB의 YY/MM/DD 형식 처리
            if (trimmed.contains("/")) {
                DateTimeFormatter oracleFormatter = DateTimeFormatter.ofPattern("yy/MM/dd");
                return LocalDate.parse(trimmed, oracleFormatter);
            }
            
            // 기본 LocalDate 파싱 시도
            return LocalDate.parse(trimmed);
            
        } catch (Exception e) {
            log.warn("날짜 파싱 실패: {}", dateStr, e);
            return null;
        }
    }

    /**
     * 자동이체 실행 이력 조회
     */
    @SuppressWarnings("unchecked")
    public Object getAutoTransferHistory(String userCi) {
        try {
            String url = hanaBankUrl + "/api/auto-payments/history";
            log.info("자동이체 실행 이력 조회 요청: {}", url);
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-User-CI", userCi);
            
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            Map<String, Object> responseBody = response.getBody();
            
            log.info("자동이체 실행 이력 응답: {}", responseBody);
            
            if (responseBody != null && Boolean.TRUE.equals(responseBody.get("success"))) {
                return responseBody.get("data");
            }
            
            return Collections.emptyList();
            
        } catch (Exception e) {
            log.error("자동이체 실행 이력 조회 실패: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * 날짜시간 문자열을 LocalDateTime으로 파싱 (여러 형식 지원)
     * @param dateTimeStr 날짜시간 문자열
     * @return LocalDateTime 객체
     */
    private LocalDateTime parseDateTimeFromOracle(String dateTimeStr) {
        if (dateTimeStr == null || dateTimeStr.trim().isEmpty()) {
            return null;
        }
        
        String trimmed = dateTimeStr.trim();
        
        try {
            // ISO 8601 형식 처리 (2025-09-10T23:57:08.304815)
            if (trimmed.contains("T")) {
                return LocalDateTime.parse(trimmed);
            }
            
            // Oracle DB의 YY/MM/DD HH:mm:ss 형식 처리
            if (trimmed.contains("/")) {
                DateTimeFormatter oracleFormatter = DateTimeFormatter.ofPattern("yy/MM/dd HH:mm:ss");
                return LocalDateTime.parse(trimmed, oracleFormatter);
            }
            
            // 기본 LocalDateTime 파싱 시도
            return LocalDateTime.parse(trimmed);
            
        } catch (Exception e) {
            // 날짜만 있는 경우 시간을 00:00:00으로 설정
            try {
                if (trimmed.contains("/")) {
                    DateTimeFormatter dateOnlyFormatter = DateTimeFormatter.ofPattern("yy/MM/dd");
                    LocalDate date = LocalDate.parse(trimmed, dateOnlyFormatter);
                    return date.atStartOfDay();
                } else {
                    // ISO 날짜 형식 시도
                    LocalDate date = LocalDate.parse(trimmed);
                    return date.atStartOfDay();
                }
            } catch (Exception e2) {
                log.warn("날짜시간 파싱 실패: {}", dateTimeStr, e2);
                return null;
            }
        }
    }
}