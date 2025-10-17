package com.example.hana_bank.service;

import com.example.hana_bank.dto.LoanApplicationDto;
import com.example.hana_bank.dto.LoanCreateDto;
import com.example.hana_bank.dto.LoanRepaymentDto;
import com.example.hana_bank.entity.Loan;
import com.example.hana_bank.entity.LoanProduct;
import com.example.hana_bank.entity.LoanRepayment;
import com.example.hana_bank.entity.User;
import com.example.hana_bank.mapper.LoanMapper;
import com.example.hana_bank.mapper.LoanRepaymentMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class LoanService {
    
    private final LoanMapper loanMapper;
    private final LoanRepaymentMapper loanRepaymentMapper;
    private final LoanProductService loanProductService;
    private final UserService userService;
    
    public Loan applyForLoan(LoanApplicationDto dto, String username) {
        User user = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        
        LoanProduct product = loanProductService.getLoanProductById(dto.getProductId())
                .orElseThrow(() -> new RuntimeException("대출 상품을 찾을 수 없습니다."));
        
        // 대출 자격 검증
        if (!product.getStatus().equals("ACTIVE")) {
            throw new RuntimeException("비활성화된 대출 상품입니다.");
        }
        
        if (dto.getLoanAmount().compareTo(product.getMaxLoanAmount()) > 0) {
            throw new RuntimeException("최대 대출 한도를 초과했습니다.");
        }
        
        if (dto.getLoanPeriod() > product.getMaxLoanPeriod()) {
            throw new RuntimeException("최대 대출 기간을 초과했습니다.");
        }
        
        LocalDate startDate = LocalDate.now();
        LocalDate endDate = startDate.plusMonths(dto.getLoanPeriod());
        
        Loan loan = Loan.builder()
                .userCi(user.getUserCi())
                .productId(dto.getProductId())
                .loanAmount(dto.getLoanAmount())
                .interestRate(product.getInterestRate())
                .loanPeriod(dto.getLoanPeriod())
                .remainingAmount(dto.getLoanAmount())
                .startDate(startDate)
                .endDate(endDate)
                .status("ACTIVE")
                .build();
        
        loanMapper.insertLoan(loan);
        return loan;
    }
    
    @Transactional(readOnly = true)
    public List<Loan> getLoansByUserCi(String userCi) {
        return loanMapper.findByUserCi(userCi);
    }
    
    @Transactional(readOnly = true)
    public List<Loan> getAllLoans() {
        return loanMapper.findAll();
    }
    
    @Transactional(readOnly = true)
    public Optional<Loan> getLoanById(Long loanId) {
        return loanMapper.findById(loanId);
    }
    
    public LoanRepayment repayLoan(LoanRepaymentDto dto, String username) {
        User user = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        
        Loan loan = loanMapper.findById(dto.getLoanId())
                .orElseThrow(() -> new RuntimeException("대출을 찾을 수 없습니다."));
        
        // 대출 소유자 확인
        if (!loan.getUserCi().equals(user.getUserCi())) {
            throw new RuntimeException("해당 대출에 대한 권한이 없습니다.");
        }
        
        if (!loan.getStatus().equals("ACTIVE")) {
            throw new RuntimeException("활성화된 대출이 아닙니다.");
        }
        
        if (dto.getRepaymentAmount().compareTo(loan.getRemainingAmount()) > 0) {
            throw new RuntimeException("상환 금액이 잔여 금액을 초과합니다.");
        }
        
        // 원금과 이자 계산 (간단한 계산법)
        BigDecimal monthlyInterestRate = loan.getInterestRate().divide(BigDecimal.valueOf(12 * 100));
        BigDecimal interestAmount = loan.getRemainingAmount().multiply(monthlyInterestRate);
        BigDecimal principalAmount = dto.getRepaymentAmount().subtract(interestAmount);
        
        if (principalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            principalAmount = dto.getRepaymentAmount();
            interestAmount = BigDecimal.ZERO;
        }
        
        LoanRepayment repayment = LoanRepayment.builder()
                .loanId(dto.getLoanId())
                .repaymentAmount(dto.getRepaymentAmount())
                .principalAmount(principalAmount)
                .interestAmount(interestAmount)
                .repaymentDate(LocalDateTime.now())
                .paymentMethod(dto.getPaymentMethod())
                .status("COMPLETED")
                .build();
        
        loanRepaymentMapper.insertLoanRepayment(repayment);
        
        // 대출 잔액 업데이트
        BigDecimal newRemainingAmount = loan.getRemainingAmount().subtract(principalAmount);
        loan.setRemainingAmount(newRemainingAmount);
        
        if (newRemainingAmount.compareTo(BigDecimal.ZERO) <= 0) {
            loan.setStatus("COMPLETED");
        }
        
        loanMapper.updateLoan(loan);
        
        return repayment;
    }
    
    @Transactional(readOnly = true)
    public List<LoanRepayment> getRepaymentsByLoanId(Long loanId) {
        return loanRepaymentMapper.findByLoanId(loanId);
    }
    
    public void updateLoan(Loan loan) {
        loanMapper.updateLoan(loan);
    }
    
    public void deleteLoan(Long loanId) {
        loanMapper.deleteLoan(loanId);
    }

    // 관리자 대출 생성
    public Loan createLoanByAdmin(LoanCreateDto dto) {
        // 사용자 존재 확인
        User user = userService.findByCi(dto.getUserCi())
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        
        // 대출상품 존재 확인
        LoanProduct product = loanProductService.getLoanProductById(dto.getProductId())
                .orElseThrow(() -> new RuntimeException("대출 상품을 찾을 수 없습니다."));
        
        // 기본 검증
        if (dto.getLoanAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("대출금액은 0보다 커야 합니다.");
        }
        
        if (dto.getLoanPeriod() <= 0) {
            throw new RuntimeException("대출기간은 0보다 커야 합니다.");
        }
        
        LocalDate startDate = dto.getStartDate() != null ? dto.getStartDate() : LocalDate.now();
        LocalDate endDate = startDate.plusMonths(dto.getLoanPeriod());
        
        Loan loan = Loan.builder()
                .userCi(dto.getUserCi())
                .productId(dto.getProductId())
                .loanAmount(dto.getLoanAmount())
                .interestRate(dto.getInterestRate() != null ? dto.getInterestRate() : product.getInterestRate())
                .loanPeriod(dto.getLoanPeriod())
                .remainingAmount(dto.getLoanAmount())
                .startDate(startDate)
                .endDate(endDate)
                .status("ACTIVE")
                .build();
        
        loanMapper.insertLoan(loan);
        return loan;
    }
}
