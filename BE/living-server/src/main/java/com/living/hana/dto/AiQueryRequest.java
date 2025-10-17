package com.living.hana.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class AiQueryRequest {
    
    @NotBlank(message = "userInput은 필수입니다")
    @Size(max = 8000, message = "userInput은 8000자를 초과할 수 없습니다")
    private String userInput;
    
    private String mode = "AUTO";
    
    private Boolean needCharts = false;
    
    private List<String> contextHints;
    
    private Integer topK = 5;
    
    @JsonProperty("uiCapabilities")
    private UiCapabilities uiCapabilities;
    
    private Boolean debug = false;
    
    @Data
    public static class UiCapabilities {
        private Boolean supportsCharts = true;
        private Boolean supportsCitations = true;
    }
}
