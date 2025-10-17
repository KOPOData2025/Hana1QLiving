package com.living.hana.service;

import com.living.hana.annotation.Logging;
import com.living.hana.dto.HanabankLoanApplicationRequest;
import com.living.hana.dto.HanabankLoanApplicationResponse;
import com.living.hana.dto.HanabankLoanInquiryResponse;
import com.living.hana.dto.HanabankLoanStatusResponse;
import com.living.hana.dto.LoanAmountSettingRequest;
import com.living.hana.dto.LoanAmountSettingResponse;
import com.living.hana.dto.LoanApplicationResponse;
import com.living.hana.dto.LoanContractRequest;
import com.living.hana.dto.LoanContractResponse;
import com.living.hana.dto.LoanInquiryRequest;
import com.living.hana.dto.LoanInquiryResponse;
import com.living.hana.dto.LoanPaymentRequest;
import com.living.hana.dto.LoanPaymentResponse;
import com.living.hana.dto.LoanStatusResponse;
import com.living.hana.entity.Loan;
import com.living.hana.mapper.LoanMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;
import java.time.LocalDateTime;
import com.living.hana.util.CurrencyFormatUtil;

@Slf4j
@Service
@RequiredArgsConstructor
public class LoanService {

    private final LoanMapper loanMapper;
    private final RestTemplate restTemplate;
    
    @Value("${hanabank.api.base-url}")
    private String hanabankApiUrl;

    public List<Loan> findAll() {
        return loanMapper.findAll();
    }

    public Loan findById(Long id) {
        return loanMapper.findById(id);
    }

    public List<Loan> findByUserId(Long userId) {
        return loanMapper.findByUserId(userId);
    }

    public List<Loan> findByContractId(Long contractId) {
        return loanMapper.findByContractId(contractId);
    }

    public List<Loan> findByStatus(String status) {
        return loanMapper.findByStatus(status);
    }

    public Loan findByApplicationId(String applicationId) {
        return loanMapper.findByApplicationId(applicationId);
    }

    @Logging(operation = "승인 정보 조회", category = "LOAN", maskSensitive = false)
    public Map<String, Object> getApprovalDetails(String applicationId) {
        try {
            // 하나은행의 모든 대출 신청 목록 조회 후 실제 승인된 데이터 찾기
            String listUrl = hanabankApiUrl + "/api/admin-loan/applications";
            log.info("[LOAN] 하나은행 대출 신청 목록 API 호출: {}", listUrl);
            
            ResponseEntity<Map> listResponse = restTemplate.getForEntity(listUrl, Map.class);
            log.info("[LOAN] 하나은행 API 응답 본문: {}", listResponse.getBody());
            
            if (listResponse.getBody() == null) {
                throw new RuntimeException("하나은행 대출 신청 목록 조회 실패: 응답 본문이 null입니다");
            }
            
            Map<String, Object> listResponseBody = listResponse.getBody();
            Object successObj = listResponseBody.get("success");

            if (!Boolean.TRUE.equals(successObj)) {
                throw new RuntimeException("하나은행 대출 신청 목록 조회 실패: success=" + successObj);
            }
            List<Map<String, Object>> applications = (List<Map<String, Object>>) listResponseBody.get("data");
            
            log.info("[LOAN] 하나은행에서 조회된 전체 대출 신청 수: {}", applications != null ? applications.size() : 0);
            
            // 실제 승인된 데이터 중에서 application_id로 매칭
            // applicationId는 LOAN-FDD8290A 형태이므로 실제 DB ID와 매칭 필요
            Map<String, Object> targetApplication = null;
            
            for (Map<String, Object> app : applications) {
                // 실제 승인된 데이터만 선택
                if ("APPROVED".equals(app.get("status")) &&
                    "APPROVED".equals(app.get("decision")) &&
                    app.get("approvedAmount") != null &&
                    app.get("interestRate") != null) {

                    targetApplication = app;
                    log.info("[LOAN] 실제 승인된 대출 신청 발견: ID={}", app.get("applicationId"));
                    break;
                }
            }
            
            if (targetApplication == null) {
                log.error("실제 승인된 대출 신청이 없습니다.");
                log.error("applicationId: {}", applicationId);
                log.error("전체 신청 목록:");
                for (Map<String, Object> app : applications) {
                    log.error("  - ID: {}, Status: {}, Decision: {}, ApprovedAmount: {}", 
                        app.get("applicationId"), app.get("status"), app.get("decision"), app.get("approvedAmount"));
                }
                throw new RuntimeException("관리자가 승인한 대출 신청이 없습니다. 하나은행에서 먼저 승인 처리를 해주세요.");
            }
            
            // 실제 승인 데이터 반환
            Map<String, Object> approvalData = new HashMap<>();
            
            // 안전한 타입 변환으로 데이터 저장
            Object approvedAmountObj = targetApplication.get("approvedAmount");
            Object interestRateObj = targetApplication.get("interestRate");

            // approvedAmount를 Long으로 안전하게 변환
            Long approvedAmount = safeParseLong(approvedAmountObj);
            if (approvedAmount != null) {
                approvalData.put("approvedAmount", approvedAmount);
            }
            
            // interestRate를 Double로 안전하게 변환
            if (interestRateObj instanceof Float) {
                approvalData.put("interestRate", ((Float) interestRateObj).doubleValue());
            } else if (interestRateObj instanceof Double) {
                approvalData.put("interestRate", interestRateObj);
            } else if (interestRateObj != null) {
                approvalData.put("interestRate", Double.valueOf(interestRateObj.toString()));
            }
            
            // loanTerm도 실제 승인된 데이터에서 가져오기
            Object loanTerm = targetApplication.get("loanTerm");
            if (loanTerm != null) {
                approvalData.put("loanTerm", loanTerm);
            } else {
                log.warn("하나은행 승인 데이터에 loanTerm 정보가 없습니다.");
            }

            return approvalData;
            
        } catch (Exception e) {
            log.error("[LOAN] 승인 정보 조회 오류 - applicationId: {}, 에러: {}", applicationId, e.getMessage(), e);
            throw new RuntimeException("승인 정보 조회에 실패했습니다: " + e.getMessage(), e);
        }
    }


    @Logging(operation = "대출 계약 생성", category = "LOAN", maskSensitive = true)
    public String createLoanContract(String applicationId, Long requestedAmount, String paymentDate, String landlordAccount) {
        try {
            // 승인 정보 검증 (실제 승인된 데이터인지 확인)
            Map<String, Object> approvalDetails = getApprovalDetails(applicationId);
            
            // 안전한 타입 변환 (Integer 또는 Long 모두 처리)
            Object approvedAmountObj = approvalDetails.get("approvedAmount");
            Long approvedLimit = safeParseLong(approvedAmountObj);
            if (approvedLimit == null) {
                throw new RuntimeException("승인 금액 정보가 없습니다.");
            }
            
            // 하나은행에서 받는 승인 한도는 만원 단위로 저장되어 있음 -> 원 단위로 변환
            Long approvedLimitInWon = approvedLimit * 10000;
            log.info("[LOAN] 승인 한도: {}만원 ({}원), 요청 금액: {}원", approvedLimit, approvedLimitInWon, requestedAmount);

            if (requestedAmount > approvedLimitInWon) {
                String requestedAmountText = CurrencyFormatUtil.formatCurrencyWithBothUnits(requestedAmount);
                String approvedLimitText = CurrencyFormatUtil.formatCurrencyWithBothUnits(approvedLimitInWon);
                throw new RuntimeException("요청 금액(" + requestedAmountText + ")이 승인 한도(" + approvedLimitText + ")를 초과했습니다.");
            }

            // 하나은행에 계약 정보 전송 (하나은행에서만 저장)
            String hanabankUrl = null;
            String hanabankContractNumber = null;
            try {
                // API URL 검증
                if (hanabankApiUrl == null || hanabankApiUrl.trim().isEmpty()) {
                    throw new RuntimeException("하나은행 API URL이 설정되지 않았습니다.");
                }

                Map<String, Object> hanabankContractRequest = new HashMap<>();
                hanabankContractRequest.put("applicationId", applicationId);
                // contractNumber 제거 - 하나은행에서 생성
                hanabankContractRequest.put("loanAmount", requestedAmount);
                hanabankContractRequest.put("paymentDate", paymentDate);
                hanabankContractRequest.put("landlordAccount", landlordAccount);

                // 하나은행이 기대하는 추가 필드들
                hanabankContractRequest.put("applicantName", "하나원큐리빙 신청자");
                hanabankContractRequest.put("loanPurpose", "전월세대출");
                hanabankContractRequest.put("desiredContractDate", paymentDate); // paymentDate를 계약 희망일로 사용

                hanabankUrl = hanabankApiUrl + "/loan/contract";
                log.info("[LOAN] 하나은행 계약 생성 API 호출: {}", hanabankUrl);

                // RestTemplate 타임아웃 및 재시도 로직
                ResponseEntity<String> hanabankResponse = null;
                int retryCount = 0;
                int maxRetries = 3;

                while (retryCount < maxRetries) {
                    try {
                        hanabankResponse = restTemplate.postForEntity(
                            hanabankUrl,
                            hanabankContractRequest,
                            String.class
                        );
                        break; // 성공하면 루프 종료
                    } catch (Exception apiException) {
                        retryCount++;
                        log.warn("하나은행 API 호출 실패 (시도 {}/{}): {}", retryCount, maxRetries, apiException.getMessage());

                        if (retryCount >= maxRetries) {
                            throw apiException; // 최대 재시도 횟수 초과
                        }

                        try {
                            Thread.sleep(1000L * retryCount);
                        } catch (InterruptedException ie) {
                            Thread.currentThread().interrupt();
                            throw new RuntimeException("재시도 중 인터럽트 발생", ie);
                        }
                    }
                }

                // 응답 검증 및 하나은행 계약번호 추출
                if (hanabankResponse.getStatusCode().is2xxSuccessful()) {
                    hanabankContractNumber = hanabankResponse.getBody();
                    log.info("[LOAN] 하나은행 계약 생성 성공: HTTP {}, 생성된 계약번호: {}",
                        hanabankResponse.getStatusCode(), hanabankContractNumber);
                } else {
                    log.error("하나은행 계약 생성 실패: HTTP {}, 응답: {}",
                        hanabankResponse.getStatusCode(), hanabankResponse.getBody());
                    throw new RuntimeException("하나은행 계약 생성에 실패했습니다. HTTP " + hanabankResponse.getStatusCode());
                }

            } catch (Exception e) {
                log.error("[LOAN] 하나은행 계약 전송 상세 오류");
                log.error("[LOAN] API URL: {}", hanabankUrl);
                log.error("[LOAN] 에러 타입: {}", e.getClass().getSimpleName());
                log.error("[LOAN] 에러 메시지: {}", e.getMessage());
                log.error("[LOAN] 상세 스택트레이스:", e);
                throw new RuntimeException("하나은행 계약 전송에 실패했습니다: " + e.getMessage(), e);
            }
            log.info("[LOAN] Step 3: 하나은행 계약 정보 전송 완료");

            log.info("[LOAN] 대출 계약서 생성 완료 - 하나은행 계약번호: {}", hanabankContractNumber);
            return hanabankContractNumber;
            
        } catch (Exception e) {
            log.error("[LOAN] LoanService 계약 생성 중 오류");
            log.error("[LOAN] 상세 스택트레이스:", e);
            throw new RuntimeException("대출 계약 생성에 실패했습니다: " + e.getMessage(), e);
        }
    }

    /**
     * 대출 실행 - 하나은행에 송금 요청
     */
    @Logging(operation = "대출 실행", category = "LOAN", maskSensitive = true)
    public String executeLoanPaymentToHanaBank(Map<String, Object> paymentRequest) {
        try {
            log.info("[LOAN] 하나원큐리빙 대출 실행 시작");
            log.info("[LOAN] Payment Request: {}", paymentRequest);
            
            String contractNumber = paymentRequest.get("contractNumber").toString();
            Long paymentAmount = Long.valueOf(paymentRequest.get("paymentAmount").toString());
            String landlordAccount = paymentRequest.get("landlordAccount").toString();
            String landlordName = paymentRequest.getOrDefault("landlordName", "임대인").toString();
            
            log.info("[LOAN] 매핑된 데이터 - contractNumber: {}, paymentAmount: {}, landlordAccount: {}, landlordName: {}",
                contractNumber, paymentAmount, landlordAccount, landlordName);
            
            // 하나은행 API 호출
            String hanabankUrl = hanabankApiUrl + "/api/admin-loan/payments/execute";
            log.info("[LOAN] 하나은행 대출 실행 API 호출: {}", hanabankUrl);
            
            ResponseEntity<Map> hanabankResponse = restTemplate.postForEntity(
                hanabankUrl, 
                paymentRequest, 
                Map.class
            );
            
            if (hanabankResponse.getBody() != null && 
                hanabankResponse.getBody().get("success").equals(true)) {
                
                String transactionId = hanabankResponse.getBody().get("data").toString();
                log.info("[LOAN] 하나은행 대출 실행 성공 - 거래번호: {}", transactionId);
                return transactionId;
                
            } else {
                log.error("하나은행 대출 실행 실패: {}", hanabankResponse.getBody());
                throw new RuntimeException("하나은행 대출 실행에 실패했습니다.");
            }
            
        } catch (Exception e) {
            log.error("대출 실행 중 오류: {}", e.getMessage(), e);
            throw new RuntimeException("대출 실행에 실패했습니다: " + e.getMessage(), e);
        }
    }

    @Logging(operation = "계약 정보 조회", category = "LOAN", maskSensitive = false)
    public Map<String, Object> getLoanContract(String contractNumber) {
        try {
            String hanabankUrl = hanabankApiUrl + "/api/admin-loan/contracts/" + contractNumber;
            log.info("[LOAN] 하나은행 계약 조회 API 호출: {}", hanabankUrl);
            
            ResponseEntity<Map> response = restTemplate.getForEntity(hanabankUrl, Map.class);
            
            if (response.getBody() != null && response.getBody().get("success").equals(true)) {
                Map<String, Object> contractData = (Map<String, Object>) response.getBody().get("data");
                log.info("[LOAN] 하나은행 계약 조회 성공: {}", contractData);
                return contractData;
            } else {
                log.error("하나은행 계약 조회 실패: {}", response.getBody());
                throw new RuntimeException("계약 정보 조회에 실패했습니다.");
            }
            
        } catch (Exception e) {
            log.error("계약 정보 조회 중 오류: {}", e.getMessage(), e);
            throw new RuntimeException("계약 정보 조회에 실패했습니다: " + e.getMessage(), e);
        }
    }

    // applicationId로 조회하는 메서드는 제거됨 - 계약번호로만 조회

    /**
     * 대출 심사 신청 처리
     */
    @Logging(operation = "대출 심사 신청", category = "LOAN", maskSensitive = true)
    public LoanApplicationResponse applyLoan(String address, String selectedLoanProduct, MultipartFile leaseContract,
                                           MultipartFile residentCopy, MultipartFile incomeProof,
                                           MultipartFile bankbook) {
        try {
            // 하나은행 서버로 대출 심사 신청 전송
            HanabankLoanApplicationResponse hanabankResponse = callHanabankLoanApplicationApi(
                address, selectedLoanProduct, leaseContract, residentCopy, incomeProof, bankbook);
            
            if (hanabankResponse != null && hanabankResponse.isSuccess()) {
                log.info("하나은행 대출 심사 신청 성공: {}", hanabankResponse.getMessage());
                return new LoanApplicationResponse(true, "대출 신청이 성공적으로 접수되었습니다.");
            } else {
                log.error("하나은행 대출 심사 신청 실패: {}", hanabankResponse);
                return new LoanApplicationResponse(false, "대출 신청 처리에 실패했습니다. 잠시 후 다시 시도해주세요.");
            }
            
        } catch (Exception e) {
            log.error("대출 심사 신청 처리 중 예외 발생: {}", e.getMessage());
            return new LoanApplicationResponse(false, "대출 신청 처리 중 오류가 발생했습니다.");
        }
    }

    /**
     * 대출 한도 조회 - 하나은행 API에 모든 계산 위임
     */
    @Logging(operation = "대출 한도 조회", category = "LOAN", maskSensitive = true)
    public LoanInquiryResponse inquireLoan(LoanInquiryRequest request) {
        logLoanInquiryRequest(request);

        try {
            // 하나은행 API 호출하여 추천 결과 받기
            HanabankLoanInquiryResponse hanabankResponse = callHanabankLoanInquiryApi(request);
            
            if (hanabankResponse != null && hanabankResponse.isSuccess()) {
                logHanabankResponse(hanabankResponse);

                // 하나은행 응답을 OneQLiving 형식으로 변환
                LoanInquiryResponse response = convertToLoanInquiryResponse(hanabankResponse);
                logFinalResponse(response);

                return response;
            } else {
                log.error("[LOAN] 하나은행 API 호출 실패: {}", hanabankResponse);
                return createErrorResponse("하나은행 API 호출에 실패했습니다. 잠시 후 다시 시도해주세요.");
            }
            
        } catch (Exception e) {
            log.error("대출 한도 조회 처리 중 예외 발생: {}", e.getMessage());
            return createErrorResponse("대출 한도 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }
    }

    /**
     * 대출 상황 조회
     */
    @Logging(operation = "대출 상황 조회", category = "LOAN", maskSensitive = false)
    public LoanStatusResponse getLoanStatus() {
        try {
            // 하나은행 API 호출하여 대출 상황 조회
            HanabankLoanStatusResponse hanabankResponse = callHanabankLoanStatusApi();
            
            if (hanabankResponse != null && hanabankResponse.isSuccess()) {
                // 하나은행 응답을 OneQLiving 형식으로 변환
                LoanStatusResponse response = convertToLoanStatusResponse(hanabankResponse);
                log.info("[LOAN] 조회 완료: {}건", response.getApplications().size());
                return response;
            } else {
                log.error("[LOAN] 하나은행 대출 상황 조회 API 호출 실패: {}", hanabankResponse);
                return new LoanStatusResponse(false, "대출 상황 조회에 실패했습니다. 잠시 후 다시 시도해주세요.", null);
            }

        } catch (Exception e) {
            log.error("[LOAN] 대출 상황 조회 중 예외 발생: {}", e.getMessage());
            return new LoanStatusResponse(false, "대출 상황 조회 중 오류가 발생했습니다.", null);
        }
    }

    /**
     * 대출 조회 요청 상세 로깅
     */
    private void logLoanInquiryRequest(LoanInquiryRequest request) {
        log.info("대출 한도 조회 요청:");
        log.info("  ├─ 대출 목적: {}", request.getLoanPurpose());
        log.info("  ├─ 이사 여부: {}", request.getIsMoving());
        log.info("  ├─ 계약 유형: {}", request.getContractType());
        log.info("  ├─ 주택 유형: {}", request.getHouseType());
        log.info("  ├─ 위치: {}", request.getLocation());
        log.info("  ├─ 보증금: {}", request.getDeposit());
        log.info("  ├─ 월세: {}", request.getMonthlyRent());
        log.info("  ├─ 계약 만기일: {}", request.getDueDate());
        log.info("  ├─ 소득 유형: {}", request.getIncomeType());
        log.info("  ├─ 취업일: {}", request.getEmploymentDate());
        log.info("  ├─ 연소득: {}", request.getAnnualIncome());
        log.info("  ├─ 혼인 상태: {}", request.getMaritalStatus());
        log.info("  ├─ 주택 보유: {}", request.getHouseOwnership());
        log.info("  ├─ 조회 유형: {}", request.getInquiryType());
        log.info("  ├─ 타임스탬프: {}", request.getTimestamp());
        log.info("  └─ 디바이스: {}", request.getDeviceInfo());
    }

    /**
     * 하나은행 응답 상세 로깅
     */
    private void logHanabankResponse(HanabankLoanInquiryResponse response) {
        HanabankLoanInquiryResponse.HanabankLoanData data = response.getData();
        log.info("하나은행 API 응답:");
        log.info("  ├─ 성공 여부: {}", response.isSuccess());
        log.info("  ├─ 메시지: {}", response.getMessage());
        log.info("  ├─ 고객 적격성:");
        log.info("  │   ├─ 적격 여부: {}", data.getCustomerEligibility().isEligible());
        log.info("  │   ├─ 신용등급: {}", data.getCustomerEligibility().getCreditGrade());
        log.info("  │   ├─ DTI 비율: {}", data.getCustomerEligibility().getDtiRatio());
        log.info("  │   ├─ DSR 비율: {}", data.getCustomerEligibility().getDsrRatio());
        log.info("  │   └─ 위험도: {}", data.getCustomerEligibility().getRiskLevel());
        log.info("  ├─ 추천 대출 한도: {}", data.getRecommendedLoanAmount());
        log.info("  ├─ 최종 금리: {}", data.getFinalInterestRate());
        log.info("  ├─ 기준금리: {}", data.getMarketRates().getBankBaseRate());
        log.info("  └─ 가산금리: {}", data.getCalculatedSpreadRate());
    }

    /**
     * OneQLiving 최종 응답 로깅
     */
    private void logFinalResponse(LoanInquiryResponse response) {
        LoanInquiryResponse.LoanInquiryData data = response.getData();
        log.info("OneQLiving 최종 응답:");
        log.info("  ├─ 성공 여부: {}", response.isSuccess());
        log.info("  ├─ 메시지: {}", response.getMessage());
        log.info("  ├─ 추천 한도: {}", data.getLoanLimit());
        log.info("  ├─ 최종 금리: {}", data.getTotalRate());
        log.info("  ├─ 기준금리: {}", data.getBaseRate());
        log.info("  ├─ 가산금리: {}", data.getSpread());
        log.info("  ├─ 금리 주기: {}", data.getCycle());
        log.info("  ├─ 기간별 금리:");
        log.info("  │   ├─ 6개월: {}", data.getInterestRate().getSixMonth());
        log.info("  │   └─ 2년: {}", data.getInterestRate().getTwoYear());
        log.info("  ├─ 추천 상품:");
        if (data.getRecommendations() != null) {
            for (int i = 0; i < data.getRecommendations().size(); i++) {
                LoanInquiryResponse.LoanRecommendation rec = data.getRecommendations().get(i);
                log.info("  │   ├─ 상품명: {}", rec.getProductName());
                log.info("  │   ├─ 한도: {}", rec.getMaxLimit());
                log.info("  │   ├─ 6개월 금리: {}", rec.getRate6m());
                log.info("  │   └─ 2년 금리: {}", rec.getRate2y());
            }
        }
        log.info("  └─ 고객 적격성:");
        if (data.getCustomerEligibility() != null) {
            log.info("      ├─ 적격 여부: {}", data.getCustomerEligibility().isEligible());
            log.info("      ├─ 신용등급: {}", data.getCustomerEligibility().getCreditGrade());
            log.info("      ├─ DTI 비율: {}", data.getCustomerEligibility().getDtiRatio());
            log.info("      ├─ DSR 비율: {}", data.getCustomerEligibility().getDsrRatio());
            log.info("      └─ 위험도: {}", data.getCustomerEligibility().getRiskLevel());
        } else {
            log.info("      └─ customerEligibility가 null입니다!");
        }
    }

    /**
     * 하나은행 대출 한도 조회 API 호출
     */
    private HanabankLoanInquiryResponse callHanabankLoanInquiryApi(LoanInquiryRequest request) {
        try {
            String url = hanabankApiUrl + "/loan/inquiry";
            log.info("[LOAN] 하나은행 대출 한도 조회 API 호출: URL={}", url);

            ResponseEntity<HanabankLoanInquiryResponse> response = restTemplate.postForEntity(
                url, request, HanabankLoanInquiryResponse.class);

            log.info("[LOAN] 하나은행 대출 한도 조회 API 응답: {}", response.getBody());
            return response.getBody();

        } catch (org.springframework.web.client.ResourceAccessException e) {
            log.error("[LOAN] 하나은행 API 연결 실패 (네트워크 오류): {}", e.getMessage());
            return null;
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("[LOAN] 하나은행 API HTTP 오류 ({}): {}", e.getStatusCode(), e.getMessage());
            return null;
        } catch (org.springframework.web.client.HttpServerErrorException e) {
            log.error("[LOAN] 하나은행 API 서버 오류 ({}): {}", e.getStatusCode(), e.getMessage());
            return null;
        } catch (Exception e) {
            log.error("[LOAN] 하나은행 대출 한도 조회 API 호출 실패: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 하나은행 대출 심사 신청 API 호출
     */
    private HanabankLoanApplicationResponse callHanabankLoanApplicationApi(
        String address, String selectedLoanProduct, MultipartFile leaseContract, MultipartFile residentCopy,
        MultipartFile incomeProof, MultipartFile bankbook) {

        try {
            // 하나은행 요청 데이터 변환
            HanabankLoanApplicationRequest hanabankRequest = convertToHanabankApplicationRequest(
                address, selectedLoanProduct, leaseContract, residentCopy, incomeProof, bankbook);
            
            String url = hanabankApiUrl + "/loan/application";
            log.info("[LOAN] 하나은행 대출 심사 신청 API 호출: URL={}", url);
            
            ResponseEntity<HanabankLoanApplicationResponse> response = restTemplate.postForEntity(
                url, hanabankRequest, HanabankLoanApplicationResponse.class);
            
            log.info("[LOAN] 하나은행 대출 심사 신청 API 응답: {}", response.getBody());
            return response.getBody();
            
        } catch (org.springframework.web.client.ResourceAccessException e) {
            log.error("[LOAN] 하나은행 API 연결 실패 (네트워크 오류): {}", e.getMessage());
            return null;
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("[LOAN] 하나은행 API HTTP 오류 ({}): {}", e.getStatusCode(), e.getMessage());
            return null;
        } catch (org.springframework.web.client.HttpServerErrorException e) {
            log.error("[LOAN] 하나은행 API 서버 오류 ({}): {}", e.getStatusCode(), e.getMessage());
            return null;
        } catch (Exception e) {
            log.error("[LOAN] 하나은행 대출 심사 신청 API 호출 실패: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 하나은행 대출 상황 조회 API 호출
     */
    private HanabankLoanStatusResponse callHanabankLoanStatusApi() {
        try {
            String url = hanabankApiUrl + "/api/admin-loan/applications";
            log.info("[LOAN] 하나은행 대출 상황 조회 API 호출: URL={}", url);

            // 하나은행의 실제 응답 구조: ApiResponseDto<List<LoanApplicationListDto>>
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);

            log.info("[LOAN] 하나은행 대출 상황 조회 API 응답: {}", response.getBody());

            if (response.getBody() != null && Boolean.TRUE.equals(response.getBody().get("success"))) {
                List<Map<String, Object>> applications = (List<Map<String, Object>>) response.getBody().get("data");

                // 하나은행 응답을 HanabankLoanStatusResponse 형태로 변환
                HanabankLoanStatusResponse hanabankResponse = new HanabankLoanStatusResponse();
                hanabankResponse.setSuccess(true);
                hanabankResponse.setMessage("조회 성공");

                List<HanabankLoanStatusResponse.HanabankLoanApplication> convertedApps = new ArrayList<>();

                for (Map<String, Object> app : applications) {
                    HanabankLoanStatusResponse.HanabankLoanApplication convertedApp =
                        new HanabankLoanStatusResponse.HanabankLoanApplication();

                    String applicationId = String.valueOf(app.get("applicationId"));
                    convertedApp.setId(applicationId);

                    // 실제 신청한 대출 상품명 사용 (DB에 저장된 selected_loan_product 값 우선)
                    String actualLoanType = (String) app.get("selectedLoanProduct");

                    if (actualLoanType == null || actualLoanType.isEmpty()) {
                        actualLoanType = (String) app.get("loanType");
                    }

                    if (actualLoanType == null || actualLoanType.isEmpty()) {
                        actualLoanType = (String) app.get("productName");
                    }

                    // DB에 상품명이 없으면 승인 금액 기준으로 추정 (fallback)
                    if (actualLoanType == null || actualLoanType.isEmpty()) {
                        Long approvedAmount = app.get("approvedAmount") != null ?
                            ((Number) app.get("approvedAmount")).longValue() : 0L;

                        // 승인 금액 기준으로 상품 추정 (만원 단위로 저장되어 있음)
                        if (approvedAmount >= 45000) { // 4500만원 이상이면 청년 대출 (90% LTV)
                            actualLoanType = "청년 전월세보증금 대출";
                        } else if (approvedAmount >= 40000 && approvedAmount < 45000) { // 4000만원대면 HF 또는 SGI
                            actualLoanType = "HF 전월세보증금 대출"; // 기본으로 HF 추정
                        } else if (approvedAmount > 0) {
                            actualLoanType = "SGI 전월세보증금 대출"; // 그 외는 SGI
                        } else {
                            actualLoanType = "전월세보증금 대출"; // 기본값
                        }

                        log.info("[LOAN] 상품명 추정 (fallback): 승인금액 {}만원 → {}", approvedAmount, actualLoanType);
                    } else {
                        log.info("[LOAN] DB에서 실제 상품명 사용: {}", actualLoanType);
                    }
                    convertedApp.setLoanType(actualLoanType);

                    convertedApp.setLoanAmount(app.get("approvedAmount") != null ?
                        ((Number) app.get("approvedAmount")).intValue() : 0);
                    convertedApp.setMaxAmount(convertedApp.getLoanAmount()); // 승인금액과 동일

                    // 계약서 생성 여부 확인하여 상태 설정
                    String originalStatus = (String) app.get("status");
                    String finalStatus = originalStatus;

                    // 상태에 따른 정확한 단계 및 진행률 설정
                    int currentStep;
                    int progress = switch (originalStatus) {
                        case "SUBMITTED" -> {
                            currentStep = 2; // 서류제출 완료
                            yield 40;
                        }
                        case "UNDER_REVIEW", "REVIEWING" -> {
                            currentStep = 3; // 서류심사 중
                            yield 60;
                        }
                        case "APPROVED", "DECISION" -> {
                            currentStep = 3; // 승인완료 (서류심사 완료, 계약서 작성 대기)
                            yield 60;
                        }
                        default -> {
                            currentStep = 2; // 기본값: 서류제출
                            yield 40;
                        }
                    };

                    // 하나은행 LOAN_CONTRACTS 테이블에서 계약 정보가 있는지 확인
                    try {
                        String contractCheckUrl = hanabankApiUrl + "/loan/contracts";
                        log.info("[LOAN] 계약 목록 조회 API 호출: {}", contractCheckUrl);

                        ResponseEntity<Map> contractResponse = restTemplate.getForEntity(contractCheckUrl, Map.class);
                        log.info("[LOAN] 계약 확인 API 응답: {}", contractResponse.getBody());
                        
                        if (contractResponse.getBody() != null &&
                            Boolean.TRUE.equals(contractResponse.getBody().get("success"))) {

                            List<Map<String, Object>> contractsList = (List<Map<String, Object>>) contractResponse.getBody().get("data");
                            log.info("[LOAN] 계약 목록: {}", contractsList);

                            // applicationId와 매칭되는 계약 찾기
                            Map<String, Object> matchingContract = null;
                            if (contractsList != null) {
                                for (Map<String, Object> contract : contractsList) {
                                    String applicationReferenceId = String.valueOf(contract.get("applicationReferenceId"));
                                    if (applicationId.equals(applicationReferenceId)) {
                                        matchingContract = contract;
                                        break;
                                    }
                                }
                            }

                            if (matchingContract != null) {
                                // 계약서가 생성되었음
                                String contractNumber = (String) matchingContract.get("contractNumber");
                                String scheduledDate = (String) matchingContract.get("scheduledDate");

                                // 계약 예정일과 오늘 날짜 비교
                                LocalDate today = LocalDate.now();
                                LocalDate contractDate = null;

                                try {
                                    if (scheduledDate != null) {
                                        contractDate = LocalDate.parse(scheduledDate);
                                    }
                                } catch (Exception e) {
                                    log.warn("scheduledDate 파싱 실패: {}", scheduledDate);
                                }

                                if (contractDate != null && contractDate.equals(today)) {
                                    finalStatus = "송금가능";
                                    currentStep = 7; // 송금 단계
                                    progress = 100;
                                    log.info("[LOAN] 송금가능 - applicationId {} 계약 예정일이 오늘: {}", applicationId, scheduledDate);
                                } else if (contractDate != null && contractDate.isBefore(today)) {
                                    finalStatus = "송금가능";
                                    currentStep = 7; // 송금 단계 (예정일 지남)
                                    progress = 100;
                                    log.info("[LOAN] 송금가능 - applicationId {} 계약 예정일이 지남: {}", applicationId, scheduledDate);
                                } else {
                                    finalStatus = "계약생성완료";
                                    currentStep = 6;
                                    progress = 90;
                                    log.info("[LOAN] 계약대기 - applicationId {} 계약 예정일: {}, 오늘: {}", applicationId, scheduledDate, today);
                                }

                                // 계약번호 설정
                                if (contractNumber != null) {
                                    convertedApp.setId(applicationId + ":" + contractNumber); // ID에 계약번호 포함
                                }

                                // 송금 예정일 설정 (계약의 scheduled_date 사용)
                                if (scheduledDate != null) {
                                    convertedApp.setExpectedCompletionDate(scheduledDate);
                                }

                                log.info("[LOAN] 계약서 생성 확인됨 - applicationId: {}, 계약번호: {}, 상태: {}, 송금일: {}", applicationId, contractNumber, finalStatus, scheduledDate);
                                log.info("[LOAN] 상태 변경: {} -> {}", originalStatus, finalStatus);
                            } else {
                                log.info("[LOAN] applicationId {} - 매칭되는 계약 없음", applicationId);
                            }
                        } else {
                            log.info("[LOAN] applicationId {} - API 응답 실패", applicationId);
                        }
                    } catch (Exception e) {
                        log.error("[LOAN] 계약 정보 확인 실패: {}", e.getMessage(), e);
                        // 계약이 없는 경우는 정상이므로 기본값 유지
                    }
                    
                    convertedApp.setStatus(finalStatus);
                    convertedApp.setProgress(progress);
                    convertedApp.setCurrentStep(currentStep);
                    convertedApp.setTotalSteps(6);
                    convertedApp.setSubmittedAt(String.valueOf(app.get("submittedAt")));

                    convertedApp.setAddress((String) app.get("address"));
                    convertedApp.setAddressCorrect(true);

                    HanabankLoanStatusResponse.HanabankDocumentStatus documents =
                        new HanabankLoanStatusResponse.HanabankDocumentStatus(true, true, true, true);
                    convertedApp.setDocuments(documents);
                    
                    convertedApps.add(convertedApp);
                }
                
                hanabankResponse.setApplications(convertedApps);
                return hanabankResponse;
                
            } else {
                log.error("[LOAN] 하나은행 API 응답 실패: {}", response.getBody());
                return null;
            }
            
        } catch (org.springframework.web.client.ResourceAccessException e) {
            log.error("[LOAN] 하나은행 API 연결 실패 (네트워크 오류): {}", e.getMessage());
            return null;
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("[LOAN] 하나은행 API HTTP 오류 ({}): {}", e.getStatusCode(), e.getMessage());
            return null;
        } catch (org.springframework.web.client.HttpServerErrorException e) {
            log.error("[LOAN] 하나은행 API 서버 오류 ({}): {}", e.getStatusCode(), e.getMessage());
            return null;
        } catch (Exception e) {
            log.error("[LOAN] 하나은행 대출 상황 조회 API 호출 실패: {}", e.getMessage(), e);
            return null;
        }
    }


    /**
     * 하나은행 심사 신청 요청을 하나은행 요청으로 변환
     */
    private HanabankLoanApplicationRequest convertToHanabankApplicationRequest(
        String address, String selectedLoanProduct, MultipartFile leaseContract, MultipartFile residentCopy,
        MultipartFile incomeProof, MultipartFile bankbook) {

        try {
            // 파일을 바이트 배열로 변환
            byte[] leaseContractBytes = leaseContract.getBytes();
            byte[] residentCopyBytes = residentCopy.getBytes();
            byte[] incomeProofBytes = incomeProof.getBytes();
            byte[] bankbookBytes = bankbook.getBytes();

            HanabankLoanApplicationRequest request = new HanabankLoanApplicationRequest();
            request.setUserCi("HANA_20990621_M_61f728f7");
            request.setAddress(address);
            request.setSelectedLoanProduct(selectedLoanProduct);
            request.setLeaseContract(leaseContractBytes);
            request.setLeaseContractFilename(leaseContract.getOriginalFilename());
            request.setResidentCopy(residentCopyBytes);
            request.setResidentCopyFilename(residentCopy.getOriginalFilename());
            request.setIncomeProof(incomeProofBytes);
            request.setIncomeProofFilename(incomeProof.getOriginalFilename());
            request.setBankbook(bankbookBytes);
            request.setBankbookFilename(bankbook.getOriginalFilename());

            return request;
        } catch (Exception e) {
            log.error("하나은행 심사 신청 요청 데이터 변환 중 오류 발생: {}", e.getMessage());
            throw new RuntimeException("하나은행 심사 신청 요청 데이터 변환 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 하나은행 응답을 OneQLiving 응답으로 변환 (하나은행 추천 결과 그대로 사용)
     */
    private LoanInquiryResponse convertToLoanInquiryResponse(HanabankLoanInquiryResponse hanabankResponse) {
        HanabankLoanInquiryResponse.HanabankLoanData data = hanabankResponse.getData();
        
        // 하나은행에서 계산된 추천 결과 사용 (null 체크 추가)
        List<LoanInquiryResponse.LoanRecommendation> recommendations = new ArrayList<>();
        if (data.getAvailableProducts() != null) {
            recommendations = data.getAvailableProducts().stream()
                .map(product -> new LoanInquiryResponse.LoanRecommendation(
                    product.getProductName(),
                    product.getMaxLimitAmount(),
                    product.getRate6m() != null ? product.getRate6m() : "3.5%",
                    product.getRate2y() != null ? product.getRate2y() : "3.8%"
                ))
                .toList();
        }
        
        // 하나은행 추천 금리 정보
        LoanInquiryResponse.InterestRateInfo interestRate = new LoanInquiryResponse.InterestRateInfo(
            data.getRecommendedRates() != null ? data.getRecommendedRates().getSixMonth() : "3.5%",
            data.getRecommendedRates() != null ? data.getRecommendedRates().getTwoYear() : "3.8%"
        );

        // 고객 적격성 정보 변환
        LoanInquiryResponse.CustomerEligibility customerEligibility = null;
        if (data.getCustomerEligibility() != null) {
            customerEligibility = new LoanInquiryResponse.CustomerEligibility(
                data.getCustomerEligibility().isEligible(),
                data.getCustomerEligibility().getCreditGrade(),
                data.getCustomerEligibility().getDtiRatio(),
                data.getCustomerEligibility().getDsrRatio(),
                data.getCustomerEligibility().getRiskLevel()
            );
        }

        // 하나은행 추천 결과 그대로 사용
        LoanInquiryResponse.LoanInquiryData loanData = new LoanInquiryResponse.LoanInquiryData();
        loanData.setLoanLimit(data.getRecommendedLoanAmount() != null ? data.getRecommendedLoanAmount() : "5000만원");
        loanData.setInterestRate(interestRate);
        loanData.setBaseRate(data.getMarketRates().getBankBaseRate());
        loanData.setSpread(data.getCalculatedSpreadRate() != null ? data.getCalculatedSpreadRate() : "1.0%");
        loanData.setTotalRate(data.getFinalInterestRate() != null ? data.getFinalInterestRate() : "3.5%");
        loanData.setCycle("6개월");
        loanData.setRecommendations(recommendations);
        loanData.setCustomerEligibility(customerEligibility);


        return new LoanInquiryResponse(true, loanData, hanabankResponse.getMessage());
    }

    /**
     * 하나은행 응답을 OneQLiving 응답으로 변환
     */
    private LoanStatusResponse convertToLoanStatusResponse(HanabankLoanStatusResponse hanabankResponse) {
        List<LoanStatusResponse.LoanApplication> applications = new ArrayList<>();
        
        if (hanabankResponse.getApplications() != null) {
            for (HanabankLoanStatusResponse.HanabankLoanApplication hanabankApp : hanabankResponse.getApplications()) {
                
                // 원본 데이터로 기본 설정
                String applicationId = hanabankApp.getId();
                String originalStatus = hanabankApp.getStatus();
                String finalStatus = originalStatus;
                int currentStep = hanabankApp.getCurrentStep();
                int progress = hanabankApp.getProgress();
                
                // 하나은행 LOAN_CONTRACTS 테이블에서 계약 정보가 있는지 확인
                try {
                    String contractCheckUrl = hanabankApiUrl + "/api/admin-loan/contracts/check/" + applicationId;
                    log.info("[LOAN] 계약 확인 API 호출: {}", contractCheckUrl);

                    ResponseEntity<Map> contractResponse = restTemplate.getForEntity(contractCheckUrl, Map.class);
                    log.info("[LOAN] 계약 확인 API 응답: {}", contractResponse.getBody());
                    
                    if (contractResponse.getBody() != null && 
                        Boolean.TRUE.equals(contractResponse.getBody().get("success"))) {
                        
                        Object dataObj = contractResponse.getBody().get("data");
                        log.info("[LOAN] 계약 데이터: {}", dataObj);
                        
                        if (dataObj != null) {
                            // 계약서가 생성되었음
                            Map<String, Object> contractData = (Map<String, Object>) dataObj;
                            String contractNumber = (String) contractData.get("contractNumber");
                            
                            finalStatus = "계약생성완료";
                            currentStep = 6;
                            progress = 100;
                            
                            // 계약번호를 ID에 포함
                            if (contractNumber != null) {
                                applicationId = applicationId + ":" + contractNumber;
                            }
                            
                            log.info("[LOAN] 계약서 생성 확인됨 - applicationId: {}, 계약번호: {}", hanabankApp.getId(), contractNumber);
                            log.info("[LOAN] 상태 변경: {} -> {}", originalStatus, finalStatus);
                        } else {
                            log.info("[LOAN] applicationId {} - 계약 데이터가 null (계약 없음)", hanabankApp.getId());
                        }
                    } else {
                        log.info("[LOAN] applicationId {} - API 응답 실패", hanabankApp.getId());
                    }
                } catch (Exception e) {
                    log.error("[LOAN] 계약 정보 확인 실패: {}", e.getMessage(), e);
                    // 계약이 없는 경우는 정상이므로 기본값 유지
                }
                
                LoanStatusResponse.LoanApplication app = new LoanStatusResponse.LoanApplication(
                    applicationId, // 계약번호가 포함된 ID
                    hanabankApp.getLoanType(),
                    hanabankApp.getLoanAmount(),
                    hanabankApp.getMaxAmount(),
                    finalStatus, // 계약 확인 후 업데이트된 상태
                    progress, // 업데이트된 진행률
                    currentStep, // 업데이트된 현재 단계
                    hanabankApp.getTotalSteps(),
                    hanabankApp.getSubmittedAt(),
                    hanabankApp.getExpectedCompletionDate(),
                    new LoanStatusResponse.DocumentStatus(
                        hanabankApp.getDocuments() != null ? hanabankApp.getDocuments().getLeaseContract() : true,
                        hanabankApp.getDocuments() != null ? hanabankApp.getDocuments().getResidentCopy() : true,
                        hanabankApp.getDocuments() != null ? hanabankApp.getDocuments().getIncomeProof() : true,
                        hanabankApp.getDocuments() != null ? hanabankApp.getDocuments().getBankbook() : true
                    ),
                    hanabankApp.getAddress(),
                    hanabankApp.getAddressCorrect(),
                    hanabankApp.getNewAddress()
                );
                applications.add(app);
            }
        }
        
        return new LoanStatusResponse(true, "대출 상황 조회 성공", applications);
    }

    /**
     * 대출 계약서 생성 및 하나은행 전송
     */
    @Logging(operation = "대출 계약서 생성 및 전송", category = "LOAN", maskSensitive = true)
    public LoanContractResponse createLoanContract(LoanContractRequest request) {
        try {
            // 1. 계약번호 생성
            String contractNumber = generateContractNumber();
            log.info("[LOAN] 생성된 계약번호: {}", contractNumber);
            
            // 2. 하나은행으로 계약 데이터 전송 (LoanContractRequest 직접 사용)
            String hanaBankReference = sendContractToHanaBank(request, contractNumber);
            
            if (hanaBankReference != null) {
                log.info("[LOAN] 하나은행 전송 성공: {}", hanaBankReference);

                // 3. 성공 응답 생성
                return new LoanContractResponse(
                    contractNumber,
                    "SCHEDULED",
                    "계약서가 생성되어 하나은행으로 전송되었습니다.",
                    request.getDesiredContractDate(),
                    request.getDesiredTime(),
                    hanaBankReference
                );
            } else {
                log.error("[LOAN] 하나은행 전송 실패");
                return new LoanContractResponse(
                    contractNumber,
                    "FAILED",
                    "하나은행 전송에 실패했습니다. 다시 시도해주세요.",
                    null,
                    null,
                    null
                );
            }
            
        } catch (Exception e) {
            log.error("대출 계약서 생성 중 오류 발생: {}", e.getMessage());
            return new LoanContractResponse(
                null,
                "ERROR",
                "계약서 생성 중 오류가 발생했습니다.",
                null,
                null,
                null
            );
        }
    }

    /**
     * 타임스탬프 생성 공통 메서드
     */
    private String generateTimestamp() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
    }

    /**
     * 안전한 Long 타입 변환
     */
    private Long safeParseLong(Object value) {
        if (value instanceof Integer) return ((Integer) value).longValue();
        if (value instanceof Long) return (Long) value;
        if (value != null) return Long.valueOf(value.toString());
        return null;
    }

    /**
     * 계약번호 생성
     */
    private String generateContractNumber() {
        return "ONQ" + generateTimestamp();
    }

    /**
     * 하나은행으로 계약 데이터 전송
     */
    private String sendContractToHanaBank(LoanContractRequest request, String contractNumber) {
        try {
            // LoanContractRequest를 직접 사용하되, 계약번호와 문서 URL을 동적으로 추가
            Map<String, Object> hanabankRequest = new HashMap<>();
            hanabankRequest.put("oneQReference", contractNumber);
            hanabankRequest.put("loanId", request.getLoanId());
            hanabankRequest.put("applicantName", request.getApplicantName());
            hanabankRequest.put("applicantSsn", request.getApplicantSsn());
            hanabankRequest.put("applicantPhone", request.getApplicantPhone());
            hanabankRequest.put("applicantEmail", request.getApplicantEmail());
            hanabankRequest.put("applicantAddress", request.getApplicantAddress());
            hanabankRequest.put("loanAmount", request.getLoanAmount());
            hanabankRequest.put("interestRate", request.getInterestRate());
            hanabankRequest.put("loanTerm", request.getLoanTerm());
            hanabankRequest.put("loanPurpose", request.getLoanPurpose());
            hanabankRequest.put("collateralType", request.getCollateralType());
            hanabankRequest.put("collateralAddress", request.getCollateralAddress());
            hanabankRequest.put("collateralValue", request.getCollateralValue());
            hanabankRequest.put("desiredContractDate", request.getDesiredContractDate());
            hanabankRequest.put("desiredTime", request.getDesiredTime());
            hanabankRequest.put("contractDocumentUrl", "https://oneqliving.com/contracts/" + contractNumber + ".pdf");

            String url = hanabankApiUrl + "/loan/contract";
            log.info("하나은행 계약서 전송 API 호출: URL={}", url);

            ResponseEntity<String> response = restTemplate.postForEntity(url, hanabankRequest, String.class);

            log.info("하나은행 계약서 전송 API 응답: {}", response.getBody());
            return response.getBody();

        } catch (Exception e) {
            log.error("하나은행 계약서 전송 실패: {}", e.getMessage());
            return null;
        }
    }
    /**
     * 대출 송금 실행
     */
    @Logging(operation = "대출 송금 실행", category = "LOAN", maskSensitive = true)
    public LoanPaymentResponse executeLoanPayment(LoanPaymentRequest request) {
        try {
            // 1. 거래번호 생성
            String transactionId = generateTransactionId();
            log.info("[LOAN] 생성된 거래번호: {}", transactionId);
            
            // 2. 하나은행으로 송금 요청 전송
            HanaBankPaymentRequest hanaBankRequest = convertToHanaBankPaymentRequest(request, transactionId);
            String paymentResult = sendPaymentToHanaBank(hanaBankRequest);
            
            if (paymentResult != null) {
                log.info("[LOAN] 하나은행 송금 성공: {}", paymentResult);
                
                // 3. 성공 응답 생성
                return new LoanPaymentResponse(
                    "SUCCESS",
                    "송금이 완료되었습니다.",
                    transactionId,
                    request.getPaymentDate(),
                    request.getAmount().toString()
                );
            } else {
                log.error("[LOAN] 하나은행 송금 실패");
                return new LoanPaymentResponse(
                    "FAILED",
                    "송금 처리에 실패했습니다.",
                    null, null, null
                );
            }
            
        } catch (Exception e) {
            log.error("대출 송금 실행 중 오류 발생: {}", e.getMessage());
            return new LoanPaymentResponse(
                "ERROR",
                "송금 중 오류가 발생했습니다.",
                null, null, null
            );
        }
    }

    /**
     * 거래번호 생성
     */
    private String generateTransactionId() {
        return "TXN" + generateTimestamp();
    }

    /**
     * 하나원큐 금액 설정 요청을 하나은행 요청으로 변환
     */
    private HanaBankAmountSettingRequest convertToHanaBankAmountRequest(LoanAmountSettingRequest request, String applicationNumber) {
        return new HanaBankAmountSettingRequest(
            applicationNumber,
            request.getApprovalId(),
            request.getRequestedAmount(),
            request.getLoanPurpose(),
            request.getLandlordInfo().getName(),
            request.getLandlordInfo().getAccount(),
            request.getLandlordInfo().getBank(),
            request.getSchedules().getContractDate(),
            request.getSchedules().getPaymentDate(),
            request.getSpecialNotes()
        );
    }

    /**
     * 하나원큐 송금 요청을 하나은행 요청으로 변환
     */
    private HanaBankPaymentRequest convertToHanaBankPaymentRequest(LoanPaymentRequest request, String transactionId) {
        return new HanaBankPaymentRequest(
            transactionId,
            request.getApplicationNumber(),
            request.getAmount(),
            request.getLandlordAccount(),
            request.getLandlordBank(),
            request.getLandlordName(),
            request.getPaymentDate(),
            request.getExecutionType()
        );
    }

    /**
     * 하나은행으로 송금 요청 전송
     */
    private String sendPaymentToHanaBank(HanaBankPaymentRequest request) {
        try {
            String url = hanabankApiUrl + "/loan/payment/execute";
            log.info("하나은행 송금 API 호출: URL={}", url);
            
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            
            log.info("하나은행 송금 API 응답: {}", response.getBody());
            return response.getBody();
            
        } catch (Exception e) {
            log.error("하나은행 송금 전송 실패: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 오류 응답 생성
     */
    private LoanInquiryResponse createErrorResponse(String message) {
        LoanInquiryResponse response = new LoanInquiryResponse();
        response.setSuccess(false);
        response.setMessage(message);
        response.setError(message);
        return response;
    }

    // 하나은행 연동을 위한 DTO 클래스들 (내부 클래스)
    private static class HanaBankAmountSettingRequest {
        private final String applicationNumber;
        private final String approvalId;
        private final java.math.BigDecimal requestedAmount;
        private final String loanPurpose;
        private final String landlordName;
        private final String landlordAccount;
        private final String landlordBank;
        private final String contractDate;
        private final String paymentDate;
        private final String specialNotes;

        public HanaBankAmountSettingRequest(String applicationNumber, String approvalId, 
                java.math.BigDecimal requestedAmount, String loanPurpose, String landlordName,
                String landlordAccount, String landlordBank, String contractDate, 
                String paymentDate, String specialNotes) {
            this.applicationNumber = applicationNumber;
            this.approvalId = approvalId;
            this.requestedAmount = requestedAmount;
            this.loanPurpose = loanPurpose;
            this.landlordName = landlordName;
            this.landlordAccount = landlordAccount;
            this.landlordBank = landlordBank;
            this.contractDate = contractDate;
            this.paymentDate = paymentDate;
            this.specialNotes = specialNotes;
        }
    }

    private static class HanaBankPaymentRequest {
        private final String transactionId;
        private final String applicationNumber;
        private final java.math.BigDecimal amount;
        private final String landlordAccount;
        private final String landlordBank;
        private final String landlordName;
        private final String paymentDate;
        private final String executionType;

        public HanaBankPaymentRequest(String transactionId, String applicationNumber, 
                java.math.BigDecimal amount, String landlordAccount, String landlordBank,
                String landlordName, String paymentDate, String executionType) {
            this.transactionId = transactionId;
            this.applicationNumber = applicationNumber;
            this.amount = amount;
            this.landlordAccount = landlordAccount;
            this.landlordBank = landlordBank;
            this.landlordName = landlordName;
            this.paymentDate = paymentDate;
            this.executionType = executionType;
        }
    }
}
