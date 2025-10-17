package com.living.hana.dto;

import lombok.Data;

@Data
public class AiFeedbackResponse {
    private Boolean accepted;
    
    public AiFeedbackResponse(Boolean accepted) {
        this.accepted = accepted;
    }
}
