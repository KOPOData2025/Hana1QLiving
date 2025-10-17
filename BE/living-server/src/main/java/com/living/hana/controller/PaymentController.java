package com.living.hana.controller;

import com.living.hana.dto.ApiResponse;
import com.living.hana.dto.TransactionHistoryResponse;
import com.living.hana.entity.Payment;
import com.living.hana.service.PaymentService;
import com.living.hana.service.HanabankAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PaymentController {

    private final PaymentService paymentService;
    private final HanabankAccountService hanabankAccountService;

    /**
     * 모든 납부 내역 조회
     * GET /api/payments
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Payment>>> getAllPayments() {
        List<Payment> payments = paymentService.findAll();
        return ResponseEntity.ok(ApiResponse.successWithMessage(payments, "납부 내역을 성공적으로 조회했습니다."));
    }

    /**
     * 납부 내역 상세 조회 (ID로)
     * GET /api/payments/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Payment>> getPaymentById(@PathVariable Long id) {
        Payment payment = paymentService.findById(id);
        if (payment != null) {
            return ResponseEntity.ok(ApiResponse.successWithMessage(payment, "납부 내역을 성공적으로 조회했습니다."));
        }
        return ResponseEntity.ok(ApiResponse.error("납부 내역을 찾을 수 없습니다."));
    }

    /**
     * 사용자별 납부 내역 조회
     * GET /api/payments/user/{userId}
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<Payment>>> getPaymentsByUserId(@PathVariable Long userId) {
        List<Payment> payments = paymentService.findByUserId(userId);
        return ResponseEntity.ok(ApiResponse.successWithMessage(payments, "사용자 납부 내역을 성공적으로 조회했습니다."));
    }

    /**
     * 상태별 납부 내역 조회
     * GET /api/payments/status/{status}
     */
    @GetMapping("/status/{status}")
    public ResponseEntity<ApiResponse<List<Payment>>> getPaymentsByStatus(@PathVariable String status) {
        List<Payment> payments = paymentService.findByStatus(status);
        return ResponseEntity.ok(ApiResponse.successWithMessage(payments, status + " 상태의 납부 내역을 성공적으로 조회했습니다."));
    }

    /**
     * 개별 납부 내역 생성
     * POST /api/payments
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Payment>> createPayment(@RequestBody Payment payment) {
        Payment createdPayment = paymentService.createPayment(payment);
        return ResponseEntity.ok(ApiResponse.successWithMessage(createdPayment, "납부 내역이 성공적으로 생성되었습니다."));
    }

    /**
     * 납부 내역 수정
     * PUT /api/payments/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Payment>> updatePayment(@PathVariable Long id, @RequestBody Payment payment) {
        payment.setId(id);
        Payment updatedPayment = paymentService.updatePayment(payment);
        return ResponseEntity.ok(ApiResponse.successWithMessage(updatedPayment, "납부 내역이 성공적으로 수정되었습니다."));
    }

    /**
     * 납부 완료 처리
     * PATCH /api/payments/{id}/pay
     */
    @PatchMapping("/{id}/pay")
    public ResponseEntity<ApiResponse<Payment>> markAsPaid(
            @PathVariable Long id,
            @RequestParam String paymentMethod) {
        Payment payment = paymentService.markAsPaid(id, paymentMethod);
        return ResponseEntity.ok(ApiResponse.successWithMessage(payment, "납부가 성공적으로 완료되었습니다."));
    }

    /**
     * 납부 내역 삭제
     * DELETE /api/payments/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePayment(@PathVariable Long id) {
        paymentService.deletePayment(id);
        return ResponseEntity.ok(ApiResponse.successWithMessage(null, "납부 내역이 성공적으로 삭제되었습니다."));
    }

    /**
     * 연체 처리 (관리자용)
     * POST /api/payments/process-overdue
     */
    @PostMapping("/process-overdue")
    public ResponseEntity<ApiResponse<Integer>> processOverduePayments() {
        int overdueCount = paymentService.processOverduePayments();
        return ResponseEntity.ok(ApiResponse.successWithMessage(overdueCount,
            overdueCount + "건의 납부 내역이 연체로 처리되었습니다."));
    }

    /**
     * 하나은행 계좌 거래내역 조회 (마이페이지용)
     * GET /api/payments/bank-transactions/{accountNumber}
     */
    @GetMapping("/bank-transactions/{accountNumber}")
    public ResponseEntity<ApiResponse<TransactionHistoryResponse>> getBankTransactions(
            @PathVariable String accountNumber,
            @RequestParam(required = false, defaultValue = "20") Integer limit,
            @RequestParam(required = false, defaultValue = "0") Integer offset) {

        TransactionHistoryResponse response = hanabankAccountService.getAccountTransactions(accountNumber, limit, offset);

        if (response.isSuccess()) {
            return ResponseEntity.ok(ApiResponse.successWithMessage(response, "거래내역을 성공적으로 조회했습니다."));
        } else {
            return ResponseEntity.ok(ApiResponse.error(response.getMessage()));
        }
    }

    /**
     * 하나은행 최근 거래내역 조회 (마이페이지용)
     * GET /api/payments/bank-transactions/{accountNumber}/recent
     */
    @GetMapping("/bank-transactions/{accountNumber}/recent")
    public ResponseEntity<ApiResponse<TransactionHistoryResponse>> getRecentBankTransactions(
            @PathVariable String accountNumber,
            @RequestParam(required = false, defaultValue = "10") Integer limit) {

        TransactionHistoryResponse response = hanabankAccountService.getRecentTransactions(accountNumber, limit);

        if (response.isSuccess()) {
            return ResponseEntity.ok(ApiResponse.successWithMessage(response, "최근 거래내역을 성공적으로 조회했습니다."));
        } else {
            return ResponseEntity.ok(ApiResponse.error(response.getMessage()));
        }
    }

    /**
     * 하나은행 카테고리별 거래내역 조회 (월세/관리비 결제 이력용)
     * GET /api/payments/bank-transactions/{accountNumber}/by-category
     */
    @GetMapping("/bank-transactions/{accountNumber}/by-category")
    public ResponseEntity<ApiResponse<TransactionHistoryResponse>> getBankTransactionsByCategory(
            @PathVariable String accountNumber,
            @RequestParam String category,
            @RequestParam(required = false, defaultValue = "20") Integer limit,
            @RequestParam(required = false, defaultValue = "0") Integer offset) {

        TransactionHistoryResponse response = hanabankAccountService.getTransactionsByCategory(accountNumber, category, limit, offset);

        if (response.isSuccess()) {
            return ResponseEntity.ok(ApiResponse.successWithMessage(response, category + " 카테고리 거래내역을 성공적으로 조회했습니다."));
        } else {
            return ResponseEntity.ok(ApiResponse.error(response.getMessage()));
        }
    }
}