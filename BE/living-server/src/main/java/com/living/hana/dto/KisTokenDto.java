package com.living.hana.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * 한국투자증권 API - 토큰 응답 DTO
 */
public class KisTokenDto {
    
    @JsonProperty("access_token")
    private String access_token;
    
    @JsonProperty("token_type")
    private String token_type;
    
    @JsonProperty("expires_in")
    private Integer expires_in;

    // 생성자
    public KisTokenDto() {}

    public KisTokenDto(String access_token, String token_type, Integer expires_in) {
        this.access_token = access_token;
        this.token_type = token_type;
        this.expires_in = expires_in;
    }

    // Getter & Setter
    public String getAccess_token() {
        return access_token;
    }

    public void setAccess_token(String access_token) {
        this.access_token = access_token;
    }

    public String getToken_type() {
        return token_type;
    }

    public void setToken_type(String token_type) {
        this.token_type = token_type;
    }

    public Integer getExpires_in() {
        return expires_in;
    }

    public void setExpires_in(Integer expires_in) {
        this.expires_in = expires_in;
    }
}