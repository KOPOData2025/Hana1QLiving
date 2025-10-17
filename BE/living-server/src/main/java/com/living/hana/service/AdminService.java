package com.living.hana.service;

import com.living.hana.annotation.Logging;
import com.living.hana.dto.AdminLoginRequest;
import com.living.hana.dto.AdminLoginResponse;
import com.living.hana.entity.Admin;
import com.living.hana.mapper.AdminMapper;
import com.living.hana.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AdminService implements UserDetailsService {

    private final AdminMapper adminMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public UserDetails loadUserByUsername(String employeeNumber) throws UsernameNotFoundException {
        // employeeNumber로 관리자 조회
        Optional<Admin> adminOpt = adminMapper.findByEmployeeNumber(employeeNumber);
        if (adminOpt.isEmpty()) {
            throw new UsernameNotFoundException("관리자를 찾을 수 없습니다: " + employeeNumber);
        }
        
        Admin admin = adminOpt.get();
        if (!admin.getIsActive()) {
            throw new UsernameNotFoundException("비활성화된 관리자 계정입니다: " + employeeNumber);
        }
        
        return admin;
    }

    /**
     * 관리자 로그인
     */
    @Logging(operation = "관리자 로그인", category = "AUTH", maskSensitive = true)
    @Transactional
    public AdminLoginResponse login(AdminLoginRequest request) {
        // 사번으로 관리자 조회
        Optional<Admin> adminOpt = adminMapper.findByEmployeeNumber(request.getEmployeeNumber());
        if (adminOpt.isEmpty()) {
            throw new BadCredentialsException("사번 또는 비밀번호가 올바르지 않습니다.");
        }

        Admin admin = adminOpt.get();
        
        // 계정 상태 확인
        if (!admin.getIsActive()) {
            throw new BadCredentialsException("비활성화된 계정입니다.");
        }

        // 비밀번호 검증
        if (!passwordEncoder.matches(request.getPassword(), admin.getPassword())) {
            throw new BadCredentialsException("사번 또는 비밀번호가 올바르지 않습니다.");
        }

        // JWT 토큰 생성
        String token = jwtTokenProvider.generateToken(admin);
        
        // 마지막 로그인 시간 업데이트 (Oracle 형식)
        String formattedDateTime = LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        adminMapper.updateLastLoginAt(admin.getId(), formattedDateTime);

        // 응답 생성 (권한 정보 제거)
        return AdminLoginResponse.builder()
                .token(token)
                .adminId(admin.getId())
                .employeeNumber(admin.getEmployeeNumber())
                .username(admin.getUsername())
                .name(admin.getName())
                .email(admin.getEmail())
                .role(admin.getRole())
                .department(admin.getDepartment())
                .phone(admin.getPhone())
                .lastLoginAt(admin.getLastLoginAt())
                .expiresAt(LocalDateTime.now().plusHours(24)) // 24시간 후 만료
                .build();
    }

    /**
     * 관리자 목록 조회
     */
    public java.util.List<Admin> getAllAdmins() {
        return adminMapper.findAll();
    }

    /**
     * 관리자 생성
     */
    @Logging(operation = "관리자 생성", category = "AUTH", maskSensitive = true)
    @Transactional
    public Admin createAdmin(Admin admin) {
        // 비밀번호 암호화
        admin.setPassword(passwordEncoder.encode(admin.getPassword()));
        
        // 기본값 설정
        if (admin.getRole() == null) {
            admin.setRole("MANAGER");
        }
        if (admin.getIsActive() == null) {
            admin.setIsActive(true);
        }
        
        adminMapper.insert(admin);
        return admin;
    }

    /**
     * 관리자 수정
     */
    @Logging(operation = "관리자 수정", category = "AUTH")
    @Transactional
    public Admin updateAdmin(Long id, Admin admin) {
        admin.setId(id);
        adminMapper.update(admin);
        return admin;
    }

    /**
     * 관리자 삭제
     */
    @Logging(operation = "관리자 삭제", category = "AUTH")
    @Transactional
    public void deleteAdmin(Long id) {
        adminMapper.deleteById(id);
    }
}
