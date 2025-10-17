package com.living.hana.service;

import com.living.hana.annotation.Logging;
import com.living.hana.entity.Reservation;
import com.living.hana.mapper.ReservationMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReservationService {

    private final ReservationMapper reservationMapper;

    public List<Reservation> findAll() {
        return reservationMapper.findAll();
    }

    @Logging(operation = "예약 생성", category = "RESERVATION", includeParams = true)
    public Reservation createReservation(Reservation reservation) {
        String currentTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        reservation.setStatus("PENDING");
        reservation.setCreatedAt(currentTime);
        reservation.setUpdatedAt(currentTime);

        reservationMapper.insert(reservation);
        return reservation;
    }

    public List<Reservation> findByUnitId(Long unitId) {
        return reservationMapper.findByUnitId(unitId);
    }

    @Logging(operation = "예약 상태 업데이트", category = "RESERVATION")
    public Reservation updateStatus(Long id, String status) {
        String currentTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        reservationMapper.updateStatus(id, status);

        // 업데이트된 예약 정보를 조회하여 반환
        Reservation updatedReservation = reservationMapper.findById(id);
        if (updatedReservation != null) {
            updatedReservation.setUpdatedAt(currentTime);
        }
        return updatedReservation;
    }

    @Logging(operation = "예약 수정", category = "RESERVATION")
    public Reservation update(Reservation reservation) {
        reservation.setUpdatedAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        reservationMapper.update(reservation);
        return reservation;
    }
}
