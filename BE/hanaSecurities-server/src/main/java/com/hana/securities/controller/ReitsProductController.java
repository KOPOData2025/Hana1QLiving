package com.hana.securities.controller;

import com.hana.securities.entity.ReitsProduct;
import com.hana.securities.service.ReitsProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/reits")
public class ReitsProductController {

    @Autowired
    private ReitsProductService reitsProductService;


    @GetMapping("/products")
    public ResponseEntity<Map<String, Object>> getAllProducts() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<ReitsProduct> activeProducts = reitsProductService.getAllActiveProducts();
            
            response.put("success", true);
            response.put("data", activeProducts);
            response.put("count", activeProducts.size());
            response.put("timestamp", System.currentTimeMillis());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("DB 조회 실패: " + e.getMessage());
            e.printStackTrace();
            response.put("success", false);
            response.put("message", "상품 목록 조회 실패");
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/products/{productId}")
    public ResponseEntity<Map<String, Object>> getProduct(@PathVariable String productId) {
        Map<String, Object> response = new HashMap<>();
        try {
            ReitsProduct product = reitsProductService.getProductById(productId);
            
            if (product != null) {
                response.put("success", true);
                response.put("data", product);
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "상품을 찾을 수 없습니다");
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "상품 조회 실패");
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/products/type/{productType}")
    public ResponseEntity<Map<String, Object>> getProductsByType(@PathVariable String productType) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<ReitsProduct> filteredProducts = reitsProductService.getProductsByType(productType);
            
            response.put("success", true);
            response.put("data", filteredProducts);
            response.put("count", filteredProducts.size());
            response.put("productType", productType);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "상품 유형별 조회 실패");
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/products/search")
    public ResponseEntity<Map<String, Object>> searchProducts(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String riskLevel) {
        
        Map<String, Object> response = new HashMap<>();
        try {
            List<ReitsProduct> filteredProducts = reitsProductService.searchProducts(name, type, riskLevel);
            
            response.put("success", true);
            response.put("data", filteredProducts);
            response.put("count", filteredProducts.size());
            response.put("searchCriteria", Map.of(
                "name", name != null ? name : "",
                "type", type != null ? type : "",
                "riskLevel", riskLevel != null ? riskLevel : ""
            ));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "상품 검색 실패");
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}