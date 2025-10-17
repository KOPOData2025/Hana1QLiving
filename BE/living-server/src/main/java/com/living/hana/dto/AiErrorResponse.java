package com.living.hana.dto;

import lombok.Data;

@Data
public class AiErrorResponse {
    private String requestId;
    private String code; // VALIDATION_ERROR, UNAUTHORIZED, BAD_GATEWAY, TIMEOUT, INTERNAL_ERROR
    private String message;
    
    public AiErrorResponse(String requestId, String code, String message) {
        this.requestId = requestId;
        this.code = code;
        this.message = message;
    }
}
