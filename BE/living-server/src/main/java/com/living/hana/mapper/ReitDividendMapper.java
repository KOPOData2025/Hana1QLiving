package com.living.hana.mapper;

import com.living.hana.entity.ReitDividend;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ReitDividendMapper {

    // REIT 상품의 배당 내역 조회
    List<ReitDividend> findByProductCode(@Param("productCode") String productCode);

    // 연도별 배당 내역 조회
    List<ReitDividend> findByProductCodeAndYear(@Param("productCode") String productCode,
                                               @Param("year") Integer year);

    // 특정 연도/분기 배당 내역 조회
    ReitDividend findByProductCodeAndYearAndQuarter(@Param("productCode") String productCode,
                                                   @Param("year") Integer year,
                                                   @Param("quarter") Integer quarter);

    // 배당 ID로 조회
    ReitDividend findByDividendId(@Param("dividendId") Long dividendId);

    // 배당 정보 등록
    int insertDividend(ReitDividend dividend);

    // 배당 정보 수정
    int updateDividend(ReitDividend dividend);

    // 배당 정보 삭제
    int deleteDividend(@Param("dividendId") Long dividendId);

    // 특정 상품의 모든 배당 정보 삭제
    void deleteByProductCode(@Param("productCode") String productCode);

    // 최근 배당 내역 조회 (상위 N개)
    List<ReitDividend> findRecentDividendsByProductCode(@Param("productCode") String productCode,
                                                       @Param("limit") Integer limit);

}