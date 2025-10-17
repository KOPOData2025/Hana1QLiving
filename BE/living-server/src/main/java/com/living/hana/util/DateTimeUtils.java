package com.living.hana.util;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class DateTimeUtils {
    
    public static final DateTimeFormatter STANDARD_FORMATTER = 
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    
    public static final DateTimeFormatter DATE_FORMATTER = 
        DateTimeFormatter.ofPattern("yyyy-MM-dd");
    
    public static final DateTimeFormatter TIME_FORMATTER = 
        DateTimeFormatter.ofPattern("HH:mm:ss");
    
    private DateTimeUtils() {
        // Utility class - private constructor
    }
    
    /**
     * 현재 시간을 표준 포맷으로 반환
     */
    public static String getCurrentTimestamp() {
        return LocalDateTime.now().format(STANDARD_FORMATTER);
    }
    
    /**
     * 현재 날짜를 반환
     */
    public static String getCurrentDate() {
        return LocalDateTime.now().format(DATE_FORMATTER);
    }
    
    /**
     * 현재 시간을 반환
     */
    public static String getCurrentTime() {
        return LocalDateTime.now().format(TIME_FORMATTER);
    }
    
    /**
     * LocalDateTime을 표준 포맷 문자열로 변환
     */
    public static String formatDateTime(LocalDateTime dateTime) {
        if (dateTime == null) {
            return null;
        }
        return dateTime.format(STANDARD_FORMATTER);
    }
    
    /**
     * 문자열을 LocalDateTime으로 파싱
     */
    public static LocalDateTime parseDateTime(String dateTimeString) {
        if (dateTimeString == null || dateTimeString.trim().isEmpty()) {
            return null;
        }
        return LocalDateTime.parse(dateTimeString, STANDARD_FORMATTER);
    }
}