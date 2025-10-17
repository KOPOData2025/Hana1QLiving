package com.living.hana.controller;

import com.living.hana.dto.ApiResponse;
import com.living.hana.entity.User;
import com.living.hana.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class UserController {

    private final UserService userService;

    /**
     * 모든 사용자 목록 조회
     * GET /api/users
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<User>>> getAllUsers() {
        List<User> users = userService.findAll();
        return ResponseEntity.ok(ApiResponse.successWithMessage(users, "사용자 목록을 성공적으로 조회했습니다."));
    }

    /**
     * 사용자 상세 정보 조회 (ID로)
     * GET /api/users/{userId}
     */
    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<User>> getUserById(@PathVariable Long userId) {
        User user = userService.findById(userId);
        if (user != null) {
            return ResponseEntity.ok(ApiResponse.successWithMessage(user, "사용자 정보를 성공적으로 조회했습니다."));
        }
        return ResponseEntity.ok(ApiResponse.error("사용자를 찾을 수 없습니다."));
    }

}
