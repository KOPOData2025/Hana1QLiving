package com.example.hana_bank.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentSlotDto {
    private String date;
    private String timeSlot;
    private boolean available;
    private String branchCode;
    private String branchName;
}