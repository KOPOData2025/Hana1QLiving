package com.living.hana.mapper;

import com.living.hana.entity.Reservation;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ReservationMapper {
    List<Reservation> findAll();
    Reservation findById(Long id);
    void insert(Reservation reservation);
    
    // unitId로 예약 찾기
    List<Reservation> findByUnitId(Long unitId);
    
    // 예약 상태 업데이트
    int updateStatus(@Param("id") Long id, @Param("status") String status);
    
    // 예약 업데이트
    int update(Reservation reservation);
}
