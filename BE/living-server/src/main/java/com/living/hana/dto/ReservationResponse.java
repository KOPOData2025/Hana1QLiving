package com.living.hana.dto;

import lombok.Data;
import lombok.AllArgsConstructor;

@Data
@AllArgsConstructor
public class ReservationResponse {
    private Long id;
    private Long buildingId;
    private Long unitId;
    private String name;
    private String email;
    private String phone;
    private String age;
    private String occupation;
    private String currentResidence;
    private String moveInDate;
    private String residencePeriod;
    private String status;
    private String createdAt;
    private String updatedAt;
}
