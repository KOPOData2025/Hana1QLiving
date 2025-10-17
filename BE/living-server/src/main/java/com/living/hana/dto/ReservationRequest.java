package com.living.hana.dto;

import lombok.Data;

@Data
public class ReservationRequest {
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
}
