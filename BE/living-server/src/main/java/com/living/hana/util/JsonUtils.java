package com.living.hana.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@Slf4j
public class JsonUtils {
    
    private static final ObjectMapper objectMapper = new ObjectMapper();
    
    /**
     * 이미지 URL 리스트를 JSON 문자열로 변환
     */
    public static String imageUrlsToJson(List<String> imageUrls) {
        if (imageUrls == null || imageUrls.isEmpty()) {
            return "[]";
        }
        
        try {
            return objectMapper.writeValueAsString(imageUrls);
        } catch (JsonProcessingException e) {
            log.error("Error converting image URLs to JSON: {}", e.getMessage());
            return "[]";
        }
    }
    
    /**
     * JSON 문자열을 이미지 URL 리스트로 파싱
     */
    public static List<String> parseImageUrls(String jsonString) {
        if (jsonString == null || jsonString.trim().isEmpty()) {
            return new ArrayList<>();
        }
        
        try {
            return objectMapper.readValue(jsonString, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            log.error("Error parsing image URLs from JSON: {}", e.getMessage());
            return new ArrayList<>();
        }
    }
    
    /**
     * 객체를 JSON 문자열로 변환
     */
    public static <T> String toJsonString(T object) {
        if (object == null) {
            return null;
        }
        
        try {
            return objectMapper.writeValueAsString(object);
        } catch (JsonProcessingException e) {
            log.error("Error converting object to JSON: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * JSON 문자열을 객체로 파싱
     */
    public static <T> T parseJson(String jsonString, Class<T> clazz) {
        if (jsonString == null || jsonString.trim().isEmpty()) {
            return null;
        }
        
        try {
            return objectMapper.readValue(jsonString, clazz);
        } catch (Exception e) {
            log.error("Error parsing JSON to {}: {}", clazz.getSimpleName(), e.getMessage());
            return null;
        }
    }
    
    /**
     * JSON 문자열을 TypeReference를 사용하여 객체로 파싱
     */
    public static <T> T parseJson(String jsonString, TypeReference<T> typeReference) {
        if (jsonString == null || jsonString.trim().isEmpty()) {
            return null;
        }
        
        try {
            return objectMapper.readValue(jsonString, typeReference);
        } catch (Exception e) {
            log.error("Error parsing JSON with TypeReference: {}", e.getMessage());
            return null;
        }
    }
}