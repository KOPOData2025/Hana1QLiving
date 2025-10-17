package com.living.hana.controller;

import com.living.hana.dto.AdminLoginRequest;
import com.living.hana.dto.AdminLoginResponse;
import com.living.hana.dto.AdminUserRequest;
import com.living.hana.dto.ApiResponse;
import com.living.hana.entity.Admin;
import com.living.hana.service.AdminService;
import com.living.hana.service.RentAutoPaymentExecutorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final RentAutoPaymentExecutorService executorService;

    /**
     * 관리자 로그인
     * POST /api/admin/login
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AdminLoginResponse>> login(@Valid @RequestBody AdminLoginRequest request) {
        try {
            AdminLoginResponse response = adminService.login(request);
            return ResponseEntity.ok(ApiResponse.successWithMessage(response, "로그인이 성공했습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // ===== 관리자 사용자 관리 엔드포인트 =====

    /**
     * 관리자 사용자 목록 조회
     * GET /api/admin/users
     */
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<Admin>>> getAllAdminUsers() {
        List<Admin> admins = adminService.getAllAdmins();
        return ResponseEntity.ok(ApiResponse.successWithMessage(admins, "관리자 목록을 성공적으로 조회했습니다."));
    }

    /**
     * 관리자 생성
     * POST /api/admin/users
     */
    @PostMapping("/users")
    public ResponseEntity<ApiResponse<Admin>> createAdminUser(@Valid @RequestBody AdminUserRequest request) {
        Admin admin = new Admin();
        admin.setUsername(request.getUsername());
        admin.setName(request.getName());
        admin.setEmail(request.getEmail());
        admin.setRole(request.getRole());
        admin.setEmployeeNumber(request.getEmployeeNumber());
        admin.setDepartment(request.getDepartment());
        admin.setPhone(request.getPhone());
        admin.setPassword(request.getPassword());
        admin.setIsActive(true); // 명시적으로 true 설정
        
        Admin createdAdmin = adminService.createAdmin(admin);
        return ResponseEntity.ok(ApiResponse.successWithMessage(createdAdmin, "관리자가 성공적으로 생성되었습니다."));
    }

    /**
     * 관리자 사용자 수정
     * PUT /api/admin/users/{id}
     */
    @PutMapping("/users/{id}")
    public ResponseEntity<ApiResponse<Admin>> updateAdminUser(@PathVariable Long id, @Valid @RequestBody AdminUserRequest request) {
        Admin admin = new Admin();
        admin.setId(id);
        admin.setUsername(request.getUsername());
        admin.setName(request.getName());
        admin.setEmail(request.getEmail());
        admin.setRole(request.getRole());
        admin.setEmployeeNumber(request.getEmployeeNumber());
        admin.setDepartment(request.getDepartment());
        admin.setPhone(request.getPhone());

        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            admin.setPassword(request.getPassword());
        }

        admin.setIsActive(true);
        
        Admin updatedAdmin = adminService.updateAdmin(id, admin);
        return ResponseEntity.ok(ApiResponse.successWithMessage(updatedAdmin, "관리자 정보가 성공적으로 수정되었습니다."));
    }

    /**
     * 관리자 사용자 삭제
     * DELETE /api/admin/users/{id}
     */
    @DeleteMapping("/users/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAdminUser(@PathVariable Long id) {
        adminService.deleteAdmin(id);
        return ResponseEntity.ok(ApiResponse.successWithMessage(null, "관리자가 성공적으로 삭제되었습니다."));
    }

    // ===== 월세 자동송금 수동 실행 엔드포인트 =====

    /**
     * 오늘 월세 자동송금 즉시 실행
     * POST /api/admin/rent-auto-payment/execute
     * ERP 관리자가 버튼 클릭으로 오늘 결제일인 월세를 즉시 이체
     *
     * @return 실행 결과 (성공/실패 건수 및 상세)
     */
    @PostMapping("/rent-auto-payment/execute")
    public ResponseEntity<ApiResponse<Map<String, Object>>> executeRentAutoPayments() {
        log.info("[ADMIN] 월세 자동송금 수동 실행 요청");

        try {
            Map<String, Object> result = executorService.executeTodayRentPayments();

            int successCount = (int) result.get("successCount");
            int failureCount = (int) result.get("failureCount");
            int totalCount = (int) result.get("totalCount");

            String message = String.format(
                "월세 자동송금 실행 완료: 전체 %d건 (성공 %d건, 실패 %d건)",
                totalCount, successCount, failureCount
            );

            log.info("[ADMIN] {}", message);

            return ResponseEntity.ok(ApiResponse.success(message, result));

        } catch (Exception e) {
            log.error("[ADMIN] 월세 자동송금 실행 중 오류 발생", e);
            return ResponseEntity.internalServerError().body(
                ApiResponse.error("월세 자동송금 실행 중 오류가 발생했습니다: " + e.getMessage())
            );
        }
    }
}
