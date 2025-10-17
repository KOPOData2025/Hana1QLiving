package com.hana.securities.util;

import java.util.HashMap;
import java.util.Map;

public class ApiResponseBuilder {
    
    public static Map<String, Object> success() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("timestamp", System.currentTimeMillis());
        return response;
    }
    
    public static Map<String, Object> success(Object data) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", data);
        response.put("timestamp", System.currentTimeMillis());
        return response;
    }
    
    public static Map<String, Object> success(String key, Object value) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put(key, value);
        response.put("timestamp", System.currentTimeMillis());
        return response;
    }
    
    public static Map<String, Object> success(String message, String key, Object value) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", message);
        response.put(key, value);
        response.put("timestamp", System.currentTimeMillis());
        return response;
    }
    
    public static Map<String, Object> error(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", message);
        response.put("timestamp", System.currentTimeMillis());
        return response;
    }
    
    public static Map<String, Object> error(String message, String errorDetail) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", message);
        response.put("error", errorDetail);
        response.put("timestamp", System.currentTimeMillis());
        return response;
    }
    
    public static Map<String, Object> error(Exception e, String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", message + ": " + e.getMessage());
        response.put("error", e.getMessage());
        response.put("timestamp", System.currentTimeMillis());
        return response;
    }
}