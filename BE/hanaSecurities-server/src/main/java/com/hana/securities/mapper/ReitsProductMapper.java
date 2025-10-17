package com.hana.securities.mapper;

import com.hana.securities.entity.ReitsProduct;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.math.BigDecimal;
import java.util.List;

@Mapper
public interface ReitsProductMapper {
    
    List<ReitsProduct> findAllActiveProducts();
    
    ReitsProduct findByProductId(@Param("productId") String productId);
    
    List<ReitsProduct> findByProductType(@Param("productType") String productType);
    
    List<ReitsProduct> searchProducts(@Param("name") String name, 
                                    @Param("type") String type, 
                                    @Param("riskLevel") String riskLevel);
    
    int insertProduct(ReitsProduct product);
    
    int updateProduct(ReitsProduct product);
    
    int deleteProduct(@Param("productId") String productId);
}