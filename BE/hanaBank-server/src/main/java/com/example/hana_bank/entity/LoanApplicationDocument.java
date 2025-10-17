package com.example.hana_bank.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoanApplicationDocument {
    private Long documentId;
    private Long applicationId;
    private String documentType;
    private String fileUrl;
    private String fileName;
    private LocalDateTime uploadedAt;
}
