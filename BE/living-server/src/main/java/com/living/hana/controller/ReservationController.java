package com.living.hana.controller;

import com.living.hana.dto.ReservationRequest;
import com.living.hana.dto.ReservationResponse;
import com.living.hana.entity.Reservation;
import com.living.hana.service.ReservationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class ReservationController {

    private final ReservationService reservationService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> createReservation(@RequestBody ReservationRequest request) {
        try {
            log.info("Reservation creation attempt for building: {}, unit: {}, name: {}", 
                    request.getBuildingId(), request.getUnitId(), request.getName());
            
            Reservation reservation = new Reservation();
            reservation.setBuildingId(request.getBuildingId());
            reservation.setUnitId(request.getUnitId());
            reservation.setName(request.getName());
            reservation.setEmail(request.getEmail());
            reservation.setPhone(request.getPhone());
            reservation.setAge(request.getAge());
            reservation.setOccupation(request.getOccupation());
            reservation.setCurrentResidence(request.getCurrentResidence());
            reservation.setMoveInDate(request.getMoveInDate());
            reservation.setResidencePeriod(request.getResidencePeriod());
            
            Reservation createdReservation = reservationService.createReservation(reservation);
            
            // 응답 데이터 구성
            ReservationResponse responseData = new ReservationResponse(
                createdReservation.getId(),
                createdReservation.getBuildingId(),
                createdReservation.getUnitId(),
                createdReservation.getName(),
                createdReservation.getEmail(),
                createdReservation.getPhone(),
                createdReservation.getAge(),
                createdReservation.getOccupation(),
                createdReservation.getCurrentResidence(),
                createdReservation.getMoveInDate(),
                createdReservation.getResidencePeriod(),
                createdReservation.getStatus(),
                createdReservation.getCreatedAt(),
                createdReservation.getUpdatedAt()
            );
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "예약이 성공적으로 생성되었습니다.");
            response.put("data", responseData);
            response.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
            
            log.info("Reservation created successfully with ID: {}", createdReservation.getId());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Reservation creation failed, error: {}", e.getMessage(), e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "예약 생성에 실패했습니다: " + e.getMessage());
            errorResponse.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
            
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @GetMapping
    public ResponseEntity<List<Reservation>> getAllReservations() {
        List<Reservation> reservations = reservationService.findAll();
        return ResponseEntity.ok(reservations);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> updateReservationStatus(
            @PathVariable Long id, 
            @RequestBody Map<String, String> request) {
        try {
            String status = request.get("status");
            log.info("Reservation status update attempt for ID: {}, new status: {}", id, status);
            
            Reservation updatedReservation = reservationService.updateStatus(id, status);
            
            // 응답 데이터 구성
            ReservationResponse responseData = new ReservationResponse(
                updatedReservation.getId(),
                updatedReservation.getBuildingId(),
                updatedReservation.getUnitId(),
                updatedReservation.getName(),
                updatedReservation.getEmail(),
                updatedReservation.getPhone(),
                updatedReservation.getAge(),
                updatedReservation.getOccupation(),
                updatedReservation.getCurrentResidence(),
                updatedReservation.getMoveInDate(),
                updatedReservation.getResidencePeriod(),
                updatedReservation.getStatus(),
                updatedReservation.getCreatedAt(),
                updatedReservation.getUpdatedAt()
            );
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "예약 상태가 성공적으로 변경되었습니다.");
            response.put("data", responseData);
            response.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
            
            log.info("Reservation status updated successfully for ID: {}", id);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Reservation status update failed for ID: {}, error: {}", id, e.getMessage(), e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "예약 상태 변경에 실패했습니다: " + e.getMessage());
            errorResponse.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
            
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
}
