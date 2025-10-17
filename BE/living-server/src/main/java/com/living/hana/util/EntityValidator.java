package com.living.hana.util;

import com.living.hana.entity.User;
import com.living.hana.entity.Building;
import com.living.hana.exception.ValidationException;
import org.springframework.stereotype.Component;

import java.util.Objects;

@Component
public class EntityValidator {
    
    /**
     * User 엔티티의 기본값 설정 및 검증
     */
    public void validateAndSetDefaults(User user) {
        if (user == null) {
            throw new IllegalArgumentException("User cannot be null");
        }
        
        // 전화번호 기본값 설정
        user.setPhone(StringUtils.defaultIfBlank(user.getPhone(), "010-0000-0000"));
        
        // 이름 기본값 설정 (이메일에서 @ 앞부분 사용)
        if (StringUtils.isBlank(user.getName()) && StringUtils.isNotBlank(user.getEmail())) {
            String defaultName = user.getEmail().contains("@") 
                ? user.getEmail().substring(0, user.getEmail().indexOf("@"))
                : user.getEmail();
            user.setName(defaultName);
        }
        
        // 주소 기본값 설정
        user.setBeforeAddress(StringUtils.defaultString(user.getBeforeAddress()));
        user.setCurrentAddress(StringUtils.defaultString(user.getCurrentAddress()));
        
        // Boolean 기본값 설정
        user.setAgreeMarketing(Objects.requireNonNullElse(user.getAgreeMarketing(), false));
        user.setStatus(Objects.requireNonNullElse(user.getStatus(), "ACTIVE"));
        
        // 역할 기본값 설정
        user.setRole(StringUtils.defaultIfBlank(user.getRole(), "USER"));
        
        // 입력값 trim 처리
        user.setName(StringUtils.safeTrim(user.getName()));
        user.setEmail(StringUtils.safeTrim(user.getEmail()));
        user.setPhone(StringUtils.safeTrim(user.getPhone()));
        user.setBeforeAddress(StringUtils.safeTrim(user.getBeforeAddress()));
        user.setCurrentAddress(StringUtils.safeTrim(user.getCurrentAddress()));
        user.setRole(StringUtils.safeTrim(user.getRole()));
    }
    
    /**
     * User 입력값 검증
     */
    public void validateUserInput(User user) {
        if (user == null) {
            throw new ValidationException("사용자 정보가 제공되지 않았습니다.");
        }
        
        if (StringUtils.isBlank(user.getEmail())) {
            throw ValidationException.requiredField("이메일");
        }
        
        if (!StringUtils.isValidEmail(user.getEmail())) {
            throw ValidationException.invalidEmail();
        }
        
        if (StringUtils.isBlank(user.getPassword())) {
            throw ValidationException.requiredField("비밀번호");
        }
        
        if (StringUtils.isNotBlank(user.getPhone()) && !StringUtils.isValidPhoneNumber(user.getPhone())) {
            throw ValidationException.invalidPhoneNumber();
        }
    }
    
    /**
     * Building 엔티티의 기본값 설정 및 검증
     */
    public void validateAndSetDefaults(Building building) {
        if (building == null) {
            throw new IllegalArgumentException("Building cannot be null");
        }
        
        // 문자열 필드 trim 처리
        building.setName(StringUtils.safeTrim(building.getName()));
        building.setAddress(StringUtils.safeTrim(building.getAddress()));
        building.setAddressDetail(StringUtils.safeTrim(building.getAddressDetail()));
        building.setZipCode(StringUtils.safeTrim(building.getZipCode()));
        
        // 기본값 설정
        building.setAddressDetail(StringUtils.defaultString(building.getAddressDetail()));
        building.setBuildingType(StringUtils.defaultIfBlank(building.getBuildingType(), "OFFICETEL"));
        
        // 상태 기본값 설정
        building.setStatus(Objects.requireNonNullElse(building.getStatus(), "ACTIVE"));
    }
    
    /**
     * Building 입력값 검증
     */
    public void validateBuildingInput(Building building) {
        if (building == null) {
            throw new IllegalArgumentException("Building cannot be null");
        }
        
        if (StringUtils.isBlank(building.getName())) {
            throw new IllegalArgumentException("Building name is required");
        }
        
        if (StringUtils.isBlank(building.getAddress())) {
            throw new IllegalArgumentException("Building address is required");
        }
        
        // Building 엔티티에는 phoneNumber 필드가 없으므로 해당 검증 제거
    }
}