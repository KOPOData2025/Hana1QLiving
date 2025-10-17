package com.living.hana.mapper;

import com.living.hana.entity.Admin;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface AdminMapper {
    
    // 관리자 조회
    Optional<Admin> findByEmployeeNumber(String employeeNumber);
    Optional<Admin> findById(Long id);
    List<Admin> findAll();
    
    // 관리자 생성
    int insert(Admin admin);
    
    // 관리자 수정
    int update(Admin admin);
    
    // 관리자 삭제
    int deleteById(Long id);
    
    // 마지막 로그인 시간 업데이트
    void updateLastLoginAt(@Param("id") Long id, @Param("lastLoginAt") String lastLoginAt);
}
