package com.living.hana.service;

import com.living.hana.entity.InvestmentTransaction;
import com.living.hana.client.HanaSecuritiesApiClient;
import com.living.hana.exception.ExternalApiException;
import com.living.hana.util.StringUtils;
import com.living.hana.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvestmentTransactionService {

    private final HanaSecuritiesApiClient hanaSecuritiesApiClient;
    private final UserService userService;

    public List<InvestmentTransaction> getUserTransactions(Long userId) {
        try {
            return fetchUserTransactions(String.valueOf(userId));
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public List<InvestmentTransaction> getUserTransactionsByUserCi(String userCi) {
        try {
            return fetchTransactionsByUserCi(processUserCi(userCi));
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public InvestmentTransaction getTransactionById(Long transactionId) {
        try {
            Map<String, Object> orderResponse = hanaSecuritiesApiClient.getOrder(String.valueOf(transactionId));
            if (orderResponse != null && Boolean.TRUE.equals(orderResponse.get("success"))) {
                Map<String, Object> order = (Map<String, Object>) orderResponse.get("data");
                return convertOrderToTransaction(order);
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    public InvestmentTransaction getTransactionByOrderId(String orderId) {
        try {
            Map<String, Object> orderResponse = hanaSecuritiesApiClient.getOrder(orderId);
            if (orderResponse != null && Boolean.TRUE.equals(orderResponse.get("success"))) {
                Map<String, Object> order = (Map<String, Object>) orderResponse.get("data");
                return convertOrderToTransaction(order);
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    private String processUserCi(String userCi) {
        if (StringUtils.isEmpty(userCi)) {
            return "UNKNOWN_CI";
        }

        if (userCi.contains("@")) {
            return userCi;
        }

        return userCi;
    }

    private InvestmentTransaction convertOrderToTransaction(Map<String, Object> order) {
        try {
            InvestmentTransaction transaction = new InvestmentTransaction();

            // 기본 정보 매핑
            if (order.get("orderId") != null) {
                String orderIdStr = String.valueOf(order.get("orderId"));
                transaction.setTransactionId((long) Math.abs(orderIdStr.hashCode()));
                transaction.setOrderId(orderIdStr);
                transaction.setBrokerOrderId(orderIdStr);
            }

            if (order.get("customerId") != null) {
                String customerId = String.valueOf(order.get("customerId"));
                transaction.setUserCi(customerId);

                try {
                    transaction.setUserId((long) Math.abs(customerId.hashCode()));
                } catch (Exception e) {
                    transaction.setUserId(1L);
                }
            }

            if (order.get("productId") != null) {
                transaction.setProductId(String.valueOf(order.get("productId")));
            }

            if (order.get("productName") != null) {
                transaction.setProductName(String.valueOf(order.get("productName")));
            }

            if (order.get("orderType") != null) {
                transaction.setTransactionType(String.valueOf(order.get("orderType")));
            }

            // 수량 및 금액 정보
            if (order.get("quantity") != null) {
                Object quantityObj = order.get("quantity");
                try {
                    if (quantityObj instanceof Number) {
                        transaction.setQuantity(((Number) quantityObj).longValue());
                    } else {
                        String quantityStr = String.valueOf(quantityObj);
                        transaction.setQuantity(Long.valueOf(quantityStr));
                    }
                } catch (NumberFormatException e) {
                    transaction.setQuantity(0L);
                }
            }

            if (order.get("unitPrice") != null) {
                Object unitPriceObj = order.get("unitPrice");
                if (unitPriceObj instanceof java.math.BigDecimal) {
                    transaction.setUnitPrice((java.math.BigDecimal) unitPriceObj);
                } else {
                    transaction.setUnitPrice(java.math.BigDecimal.valueOf(
                        Double.parseDouble(String.valueOf(unitPriceObj))
                    ));
                }
            }

            if (order.get("totalAmount") != null) {
                Object totalAmountObj = order.get("totalAmount");
                if (totalAmountObj instanceof java.math.BigDecimal) {
                    transaction.setTransactionAmount((java.math.BigDecimal) totalAmountObj);
                } else {
                    transaction.setTransactionAmount(java.math.BigDecimal.valueOf(
                        Double.parseDouble(String.valueOf(totalAmountObj))
                    ));
                }
            }

            if (order.get("status") != null) {
                transaction.setStatus(String.valueOf(order.get("status")));
            }

            // 시간 정보 처리
            LocalDateTime actualOrderTime = null;
            LocalDateTime actualExecutedTime = null;

            if (order.get("orderTime") != null) {
                Object orderTimeObj = order.get("orderTime");
                if (orderTimeObj instanceof LocalDateTime) {
                    actualOrderTime = (LocalDateTime) orderTimeObj;
                } else if (orderTimeObj instanceof String) {
                    try {
                        actualOrderTime = LocalDateTime.parse(String.valueOf(orderTimeObj));
                    } catch (Exception e) {
                        log.warn("orderTime 파싱 실패: {}", orderTimeObj);
                    }
                }
            }

            if (order.get("createdAt") != null) {
                Object createdAtObj = order.get("createdAt");
                if (createdAtObj instanceof LocalDateTime) {
                    actualOrderTime = (LocalDateTime) createdAtObj;
                } else if (createdAtObj instanceof String) {
                    try {
                        actualOrderTime = LocalDateTime.parse(String.valueOf(createdAtObj));
                    } catch (Exception e) {
                        log.warn("createdAt 파싱 실패: {}", createdAtObj);
                    }
                }
            }

            if (order.get("executedTime") != null) {
                Object executedTimeObj = order.get("executedTime");
                if (executedTimeObj instanceof LocalDateTime) {
                    actualExecutedTime = (LocalDateTime) executedTimeObj;
                } else if (executedTimeObj instanceof String) {
                    try {
                        actualExecutedTime = LocalDateTime.parse(String.valueOf(executedTimeObj));
                    } catch (Exception e) {
                        log.warn("executedTime 파싱 실패: {}", executedTimeObj);
                    }
                }
            }

            if (order.get("executedAt") != null) {
                Object executedAtObj = order.get("executedAt");
                if (executedAtObj instanceof LocalDateTime) {
                    actualExecutedTime = (LocalDateTime) executedAtObj;
                } else if (executedAtObj instanceof String) {
                    try {
                        actualExecutedTime = LocalDateTime.parse(String.valueOf(executedAtObj));
                    } catch (Exception e) {
                        log.warn("executedAt 파싱 실패: {}", executedAtObj);
                    }
                }
            }

            if (actualOrderTime != null) {
                transaction.setCreatedAt(actualOrderTime);
            } else {
                log.warn("실제 주문 시간을 찾을 수 없어 현재 시간으로 설정 - orderId: {}", order.get("orderId"));
                transaction.setCreatedAt(LocalDateTime.now());
            }

            if (actualExecutedTime != null) {
                transaction.setExecutedAt(actualExecutedTime);
                transaction.setTransactionDate(actualExecutedTime);
            } else if ("EXECUTED".equals(transaction.getStatus()) || "COMPLETED".equals(transaction.getStatus())) {
                if (actualOrderTime != null) {
                    transaction.setExecutedAt(actualOrderTime);
                    transaction.setTransactionDate(actualOrderTime);
                } else {
                    transaction.setExecutedAt(LocalDateTime.now());
                    transaction.setTransactionDate(LocalDateTime.now());
                }
            } else {
                transaction.setTransactionDate(actualOrderTime != null ? actualOrderTime : LocalDateTime.now());
            }

            return transaction;
        } catch (Exception e) {
            return null;
        }
    }

    private List<InvestmentTransaction> fetchUserTransactions(String userId) {
        log.info("하나증권 API 거래내역 조회 시작 - userId: {}", userId);
        Map<String, Object> orderResponse = hanaSecuritiesApiClient.getOrderHistory(userId);

        log.info("하나증권 API 응답: {}", orderResponse);

        if (orderResponse != null && Boolean.TRUE.equals(orderResponse.get("success"))) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> orders = (List<Map<String, Object>>) orderResponse.get("data");
            List<InvestmentTransaction> transactions = new ArrayList<>();

            log.info("주문 데이터 개수: {}", orders != null ? orders.size() : 0);

            if (orders != null) {
                for (Map<String, Object> order : orders) {
                    InvestmentTransaction transaction = convertOrderToTransaction(order);
                    if (transaction != null) {
                        transactions.add(transaction);
                    }
                }
            }

            log.info("변환된 거래내역 개수: {}", transactions.size());
            return transactions;
        } else {
            log.error("하나증권 API 호출 실패 - 응답: {}", orderResponse);
            throw ExternalApiException.invalidResponse("하나증권");
        }
    }

    private List<InvestmentTransaction> fetchTransactionsByUserCi(String processedUserCi) {
        Map<String, Object> orderResponse = hanaSecuritiesApiClient.getOrderHistory(processedUserCi);

        if (orderResponse != null && Boolean.TRUE.equals(orderResponse.get("success"))) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> orders = (List<Map<String, Object>>) orderResponse.get("data");
            List<InvestmentTransaction> transactions = new ArrayList<>();

            if (orders != null) {
                for (Map<String, Object> order : orders) {
                    InvestmentTransaction transaction = convertOrderToTransaction(order);
                    if (transaction != null) {
                        transactions.add(transaction);
                    }
                }
            }

            return transactions;
        } else {
            return new ArrayList<>();
        }
    }

    public Map<String, Object> calculateTradingProfitLoss(Long userId) {
        try {
            String userCiForSearch = convertUserIdToUserCi(userId);

            List<InvestmentTransaction> allTransactions;
            if (userCiForSearch != null) {
                allTransactions = fetchTransactionsByUserCi(userCiForSearch);
            } else {
                allTransactions = fetchUserTransactions(String.valueOf(userId));
            }

            log.info("조회된 거래내역 수: {}", allTransactions.size());

            List<InvestmentTransaction> sellTransactions = allTransactions.stream()
                .filter(t -> "SELL".equals(t.getTransactionType()))
                .filter(t -> "EXECUTED".equals(t.getStatus()) || "COMPLETED".equals(t.getStatus()))
                .collect(Collectors.toList());

            List<Map<String, Object>> realizedProfits = new ArrayList<>();
            double totalRealizedProfit = 0.0;
            double totalFees = 0.0;
            double totalBuyAmount = 0.0;
            double totalSellAmount = 0.0;

            for (InvestmentTransaction sellTx : sellTransactions) {
                List<InvestmentTransaction> buyTransactions = allTransactions.stream()
                    .filter(t -> "BUY".equals(t.getTransactionType()))
                    .filter(t -> sellTx.getProductId().equals(t.getProductId()))
                    .filter(t -> t.getCreatedAt().isBefore(sellTx.getCreatedAt()))
                    .sorted((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()))
                    .toList();

                if (!buyTransactions.isEmpty()) {
                    double avgBuyPrice = buyTransactions.stream()
                        .mapToDouble(t -> t.getUnitPrice() != null ? t.getUnitPrice().doubleValue() : 0.0)
                        .average()
                        .orElse(0.0);

                    double sellPrice = sellTx.getUnitPrice() != null ? sellTx.getUnitPrice().doubleValue() : 0.0;
                    long quantity = sellTx.getQuantity() != null ? sellTx.getQuantity() : 0;
                    double profit = (sellPrice - avgBuyPrice) * quantity;
                    double profitRate = avgBuyPrice != 0 ? (profit / (avgBuyPrice * quantity)) * 100 : 0;

                    double fees = sellTx.getFees() != null ? sellTx.getFees().doubleValue() : 0.0;
                    double netProfit = profit - fees;

                    Map<String, Object> profitData = new HashMap<>();
                    profitData.put("transactionId", sellTx.getTransactionId().toString());
                    profitData.put("productName", sellTx.getProductName() != null ? sellTx.getProductName() : "상품명 없음");
                    profitData.put("sellDate", sellTx.getCreatedAt().toString());
                    profitData.put("sellPrice", sellPrice);
                    profitData.put("buyPrice", avgBuyPrice);
                    profitData.put("quantity", quantity);
                    profitData.put("profit", profit);
                    profitData.put("profitRate", profitRate);
                    profitData.put("fees", fees);
                    profitData.put("netProfit", netProfit);

                    realizedProfits.add(profitData);

                    totalRealizedProfit += profit;
                    totalFees += fees;
                    totalBuyAmount += avgBuyPrice * quantity;
                    totalSellAmount += sellPrice * quantity;
                }
            }

            double totalRealizedProfitRate = totalBuyAmount != 0 ? (totalRealizedProfit / totalBuyAmount) * 100 : 0;
            double totalNetProfit = totalRealizedProfit - totalFees;

            Map<String, Object> result = new HashMap<>();
            result.put("realizedProfits", realizedProfits);
            result.put("totalRealizedProfit", totalRealizedProfit);
            result.put("totalRealizedProfitRate", totalRealizedProfitRate);
            result.put("totalFees", totalFees);
            result.put("totalNetProfit", totalNetProfit);
            result.put("generatedAt", System.currentTimeMillis());

            return result;
        } catch (Exception e) {
            return new HashMap<>();
        }
    }

    private String convertUserIdToUserCi(Long userId) {
        try {
            User user = userService.findById(userId);
            if (user != null && user.getUserCi() != null) {
                return processUserCi(user.getUserCi());
            } else {
                log.warn("userId {}에 해당하는 사용자 또는 CI 정보가 없음", userId);
                return null;
            }
        } catch (Exception e) {
            log.error("userId {}를 userCi로 변환 중 오류: {}", userId, e.getMessage());
            return null;
        }
    }

    /**
     * 사용자별 배당 내역 조회 (하나증권 API 기반)
     */
    public List<Map<String, Object>> getDividendHistory(Long userId) {
        try {
            log.info("배당 내역 조회 요청: userId={}", userId);

            // userId를 userCi로 변환
            String userCi = convertUserIdToUserCi(userId);
            if (userCi == null) {
                log.warn("사용자 CI 정보가 없어 배당 내역 조회 불가: userId={}", userId);
                return new ArrayList<>();
            }

            Map<String, Object> dividendResponse = hanaSecuritiesApiClient.getDividendHistory(userCi);

            if (dividendResponse != null && Boolean.TRUE.equals(dividendResponse.get("success"))) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> dividends = (List<Map<String, Object>>) dividendResponse.get("data");

                if (dividends != null) {
                    log.info("배당 내역 조회 성공: userId={}, 건수={}", userId, dividends.size());
                    return dividends;
                } else {
                    log.info("배당 내역 없음: userId={}", userId);
                    return new ArrayList<>();
                }
            } else {
                log.error("하나증권 배당 내역 조회 실패: userId={}, response={}", userId, dividendResponse);
                return new ArrayList<>();
            }

        } catch (Exception e) {
            log.error("배당 내역 조회 중 오류: userId={}, error={}", userId, e.getMessage(), e);
            return new ArrayList<>();
        }
    }

    /**
     * 사용자별 배당 총 수익 조회
     */
    public Map<String, Object> getDividendSummary(Long userId) {
        try {
            List<Map<String, Object>> dividendHistory = getDividendHistory(userId);

            double totalDividendAmount = 0.0;
            int dividendCount = 0;
            String lastDividendDate = null;

            for (Map<String, Object> dividend : dividendHistory) {
                Object amountObj = dividend.get("amount");
                if (amountObj != null) {
                    if (amountObj instanceof Number) {
                        totalDividendAmount += ((Number) amountObj).doubleValue();
                    }
                }

                Object dateObj = dividend.get("paymentDate");
                if (dateObj != null && (lastDividendDate == null || dateObj.toString().compareTo(lastDividendDate) > 0)) {
                    lastDividendDate = dateObj.toString();
                }

                dividendCount++;
            }

            Map<String, Object> summary = new HashMap<>();
            summary.put("totalDividendAmount", totalDividendAmount);
            summary.put("dividendCount", dividendCount);
            summary.put("lastDividendDate", lastDividendDate);
            summary.put("dividendHistory", dividendHistory);

            return summary;

        } catch (Exception e) {
            log.error("배당 요약 정보 조회 중 오류: userId={}", userId, e);
            return new HashMap<>();
        }
    }
}