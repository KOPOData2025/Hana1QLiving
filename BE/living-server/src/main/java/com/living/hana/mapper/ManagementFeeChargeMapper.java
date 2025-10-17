package com.living.hana.mapper;

import com.living.hana.entity.ManagementFeeCharge;
import com.living.hana.dto.ManagementFeeChargeResponse;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ManagementFeeChargeMapper {

    // 관리비 청구 생성
    void insertManagementFeeCharge(ManagementFeeCharge charge);

    // 관리비 청구 조회 (ID로)
    ManagementFeeCharge selectManagementFeeChargeById(@Param("id") Long id);

    // 호실별 관리비 청구 목록 조회
    List<ManagementFeeChargeResponse> selectManagementFeeChargesByUnitId(@Param("unitId") Long unitId);

    // 사용자별 관리비 청구 목록 조회 (계약 정보 기반)
    List<ManagementFeeChargeResponse> selectManagementFeeChargesByUserId(@Param("userId") Long userId);

    // 관리자용 전체 관리비 청구 목록 조회
    List<ManagementFeeChargeResponse> selectAllManagementFeeCharges();

    // 관리비 청구 상태 업데이트
    void updateManagementFeeChargeStatus(@Param("id") Long id, @Param("status") String status);

    // 관리비 청구에 결제 정보 연결
    void updateManagementFeeChargePaymentInfo(@Param("id") Long id,
                                              @Param("paymentId") Long paymentId,
                                              @Param("autoPaymentTriggered") String autoPaymentTriggered);

}