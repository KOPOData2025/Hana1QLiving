package com.example.hana_bank.service;

import com.example.hana_bank.dto.LoanProductCreateDto;
import com.example.hana_bank.entity.LoanProduct;
import com.example.hana_bank.mapper.LoanProductMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class LoanProductService {
    
    private final LoanProductMapper loanProductMapper;
    
    public LoanProduct createLoanProduct(LoanProduct loanProduct) {
        loanProduct.setStatus("ACTIVE");
        loanProductMapper.insertLoanProduct(loanProduct);
        return loanProduct;
    }
    
    public LoanProduct createLoanProductFromDto(LoanProductCreateDto dto) {
        LoanProduct loanProduct = LoanProduct.builder()
                .productName(dto.getProductName())
                .productDescription(dto.getProductDescription())
                .interestRate(BigDecimal.valueOf(dto.getInterestRate()))
                .maxLoanAmount(BigDecimal.valueOf(dto.getMaxLoanAmount()))
                .maxLoanPeriod(dto.getMaxLoanPeriod())
                .eligibilityRequirements(dto.getEligibilityRequirements())
                .status(dto.getStatus() != null ? dto.getStatus() : "ACTIVE")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        loanProductMapper.insertLoanProduct(loanProduct);

        return loanProduct;
    }
    
    @Transactional(readOnly = true)
    public List<LoanProduct> getAllLoanProducts() {
        return loanProductMapper.findAll();
    }
    
    @Transactional(readOnly = true)
    public List<LoanProduct> getActiveLoanProducts() {
        return loanProductMapper.findByStatus("ACTIVE");
    }
    
    @Transactional(readOnly = true)
    public Optional<LoanProduct> getLoanProductById(Long productId) {
        return loanProductMapper.findById(productId);
    }
    
    public void updateLoanProduct(LoanProduct loanProduct) {
        loanProductMapper.updateLoanProduct(loanProduct);
    }
    
    public void deleteLoanProduct(Long productId) {
        loanProductMapper.deleteLoanProduct(productId);
    }
    
    public void deactivateLoanProduct(Long productId) {
        Optional<LoanProduct> loanProduct = loanProductMapper.findById(productId);
        if (loanProduct.isPresent()) {
            LoanProduct product = loanProduct.get();
            product.setStatus("INACTIVE");
            loanProductMapper.updateLoanProduct(product);
        }
    }
}
