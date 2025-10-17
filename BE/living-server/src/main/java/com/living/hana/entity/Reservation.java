package com.living.hana.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Reservation {
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
    private String status; // PENDING, CONFIRMED, CANCELLED, COMPLETED
    private String createdAt;
    private String updatedAt;
}
