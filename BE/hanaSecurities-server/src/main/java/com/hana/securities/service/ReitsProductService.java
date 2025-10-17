package com.hana.securities.service;

import com.hana.securities.entity.ReitsProduct;
import com.hana.securities.mapper.ReitsProductMapper;
import com.hana.securities.exception.ProductException;
import com.hana.securities.exception.DatabaseException;
import com.hana.securities.exception.ValidationException;
import com.hana.securities.util.ServiceLogger;
import com.hana.securities.util.StringUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service // REITs 서비스 활성화
@RequiredArgsConstructor
@Slf4j
public class ReitsProductService {

    private final ReitsProductMapper reitsProductMapper;
    private final ServiceLogger serviceLogger;

    public List<ReitsProduct> getAllActiveProducts() {
        return serviceLogger.executeDbQuery("REITs 상품", "활성 상품 전체 조회", null, () -> {
            List<ReitsProduct> products = reitsProductMapper.findAllActiveProducts();
            return products;
        });
    }

    public ReitsProduct getProductById(String productId) {
        return serviceLogger.executeDbQuery("REITs 상품", "ID별 조회", productId, () -> {
            if (StringUtils.isEmpty(productId)) {
                throw ValidationException.requiredField("상품ID");
            }
            
            ReitsProduct product = reitsProductMapper.findByProductId(productId);
            if (product == null) {
                throw ProductException.productNotFound(productId);
            }
            
            return product;
        });
    }
    
    // 예외를 던지지 않고 null을 반환하는 메서드 (OrderController용)
    public ReitsProduct findProductById(String productId) {
        return serviceLogger.executeDbQuery("REITs 상품", "ID별 조회 (null 허용)", productId, () -> {
            if (StringUtils.isEmpty(productId)) {
                return null;
            }
            
            ReitsProduct product = reitsProductMapper.findByProductId(productId);
            if (product != null) {
            } else {
            }
            
            return product;
        });
    }

    public List<ReitsProduct> getProductsByType(String productType) {
        return serviceLogger.executeDbQuery("REITs 상품", "타입별 조회", productType, () -> {
            if (StringUtils.isEmpty(productType)) {
                throw ValidationException.requiredField("상품유형");
            }
            
            List<ReitsProduct> products = reitsProductMapper.findByProductType(productType);
            return products;
        });
    }

    public List<ReitsProduct> searchProducts(String name, String type, String riskLevel) {
        return serviceLogger.executeWithLogging("REITs 상품 검색", 
            Map.of("name", StringUtils.defaultIfEmpty(name, ""), 
                   "type", StringUtils.defaultIfEmpty(type, ""),
                   "riskLevel", StringUtils.defaultIfEmpty(riskLevel, "")), () -> {
            
            List<ReitsProduct> products = reitsProductMapper.searchProducts(name, type, riskLevel);
            return products;
        });
    }

    public ReitsProduct createProduct(ReitsProduct product) {
        return serviceLogger.executeWithLogging("REITs 상품 생성", 
            Map.of("productId", product.getProductId(), "productName", product.getProductName()), () -> {
            
            validateProductForCreation(product);
            
            try {
                reitsProductMapper.insertProduct(product);
                return product;
            } catch (org.springframework.dao.DataIntegrityViolationException e) {
                throw ProductException.productCreationFailed("데이터 무결성 위반: " + e.getMessage());
            } catch (Exception e) {
                throw ProductException.productCreationFailed(e.getMessage());
            }
        });
    }

    public ReitsProduct updateProduct(ReitsProduct product) {
        return serviceLogger.executeWithLogging("REITs 상품 수정", 
            Map.of("productId", product.getProductId(), "productName", product.getProductName()), () -> {
            
            validateProductForUpdate(product);
            
            try {
                int updatedRows = reitsProductMapper.updateProduct(product);
                if (updatedRows == 0) {
                    throw ProductException.productNotFound(product.getProductId());
                }
                
                return product;
            } catch (ProductException e) {
                throw e; // 이미 적절한 예외이므로 재던짐
            } catch (Exception e) {
                throw ProductException.productUpdateFailed(e.getMessage());
            }
        });
    }

    public boolean deleteProduct(String productId) {
        return serviceLogger.executeWithLogging("REITs 상품 삭제", productId, () -> {
            if (StringUtils.isEmpty(productId)) {
                throw ValidationException.requiredField("상품ID");
            }
            
            try {
                int deletedRows = reitsProductMapper.deleteProduct(productId);
                boolean success = deletedRows > 0;
                
                if (!success) {
                    throw ProductException.productNotFound(productId);
                }
                
                return true;
            } catch (ProductException e) {
                throw e; // 이미 적절한 예외이므로 재던짐
            } catch (Exception e) {
                throw ProductException.productDeletionFailed(e.getMessage());
            }
        });
    }
    
    public boolean productExists(String productId) {
        return serviceLogger.executeDbQuery("REITs 상품", "존재 여부 확인", productId, () -> {
            if (StringUtils.isEmpty(productId)) {
                return false;
            }
            
            try {
                ReitsProduct product = reitsProductMapper.findByProductId(productId);
                boolean exists = product != null;
                return exists;
            } catch (Exception e) {
                return false;
            }
        });
    }
    
    private void validateProductForCreation(ReitsProduct product) {
        if (product == null) {
            throw ValidationException.requiredField("상품 정보");
        }
        
        if (StringUtils.isEmpty(product.getProductId())) {
            throw ValidationException.requiredField("상품ID");
        }
        
        if (StringUtils.isEmpty(product.getProductName())) {
            throw ValidationException.requiredField("상품명");
        }
        
        if (StringUtils.isEmpty(product.getProductType())) {
            throw ValidationException.requiredField("상품유형");
        }
        
        // 중복 상품 확인
        if (productExists(product.getProductId())) {
            throw ProductException.productAlreadyExists(product.getProductId());
        }
        
        serviceLogger.logValidation("REITs 상품 생성 유효성 검증", product.getProductId(), true, "모든 검증 통과");
    }
    
    private void validateProductForUpdate(ReitsProduct product) {
        if (product == null) {
            throw ValidationException.requiredField("상품 정보");
        }
        
        if (StringUtils.isEmpty(product.getProductId())) {
            throw ValidationException.requiredField("상품ID");
        }
        
        if (StringUtils.isEmpty(product.getProductName())) {
            throw ValidationException.requiredField("상품명");
        }
        
        // 상품 존재 확인
        if (!productExists(product.getProductId())) {
            throw ProductException.productNotFound(product.getProductId());
        }
        
        serviceLogger.logValidation("REITs 상품 수정 유효성 검증", product.getProductId(), true, "모든 검증 통과");
    }
    
}