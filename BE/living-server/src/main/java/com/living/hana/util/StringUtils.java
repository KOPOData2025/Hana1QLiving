package com.living.hana.util;

public class StringUtils {
    
    private StringUtils() {
        // Utility class - private constructor
    }
    
    /**
     * 문자열이 null이거나 빈 문자열인지 확인
     */
    public static boolean isEmpty(String str) {
        return str == null || str.isEmpty();
    }
    
    /**
     * 문자열이 null이거나 공백인지 확인
     */
    public static boolean isBlank(String str) {
        return str == null || str.trim().isEmpty();
    }
    
    /**
     * 문자열이 null이 아니고 공백이 아닌지 확인
     */
    public static boolean isNotBlank(String str) {
        return !isBlank(str);
    }
    
    /**
     * 값이 null이거나 공백이면 기본값 반환, 아니면 원래값의 trim 반환
     */
    public static String defaultIfBlank(String str, String defaultValue) {
        return isBlank(str) ? defaultValue : str.trim();
    }
    
    /**
     * 값이 null이면 빈 문자열 반환, 아니면 원래값의 trim 반환
     */
    public static String defaultString(String str) {
        return defaultIfBlank(str, "");
    }
    
    /**
     * 안전한 trim (null 체크 포함)
     */
    public static String safeTrim(String str) {
        return str == null ? null : str.trim();
    }
    
    /**
     * 전화번호 형식 검증
     */
    public static boolean isValidPhoneNumber(String phoneNumber) {
        if (isBlank(phoneNumber)) {
            return false;
        }
        return phoneNumber.matches("^\\d{3}-\\d{4}-\\d{4}$");
    }
    
    /**
     * 이메일 형식 검증
     */
    public static boolean isValidEmail(String email) {
        if (isBlank(email)) {
            return false;
        }
        return email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    }
    
    /**
     * 문자열 마스킹 (개인정보 보호용)
     */
    public static String maskString(String str, int startVisible, int endVisible) {
        if (isBlank(str)) {
            return str;
        }
        
        int length = str.length();
        if (length <= startVisible + endVisible) {
            return str;
        }

        int maskLength = length - startVisible - endVisible;

        String masked = str.substring(0, startVisible) +
                "*".repeat(maskLength) +
                str.substring(length - endVisible);
        
        return masked;
    }
}