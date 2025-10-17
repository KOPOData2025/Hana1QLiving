package com.living.hana.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class AiFeedbackRequest {
    
    @NotBlank(message = "requestId는 필수입니다")
    private String requestId;
    
    @NotNull(message = "rating은 필수입니다")
    private String rating; // UP, DOWN, NEUTRAL
    
    private List<String> categories; // HALLUCINATION, SECURITY, USEFULNESS, SPEED, OTHER
    
    private String comment;
}
