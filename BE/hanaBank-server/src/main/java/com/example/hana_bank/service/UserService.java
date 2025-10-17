package com.example.hana_bank.service;

import com.example.hana_bank.dto.UserRegistrationDto;
import com.example.hana_bank.entity.User;
import com.example.hana_bank.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {
    
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    
    public User registerUser(UserRegistrationDto dto) {
        // 중복 체크
        if (userMapper.existsByUsername(dto.getUsername())) {
            throw new RuntimeException("이미 존재하는 사용자명입니다.");
        }
        if (userMapper.existsByEmail(dto.getEmail())) {
            throw new RuntimeException("이미 존재하는 이메일입니다.");
        }
        if (userMapper.existsByCi(dto.getUserCi())) {
            throw new RuntimeException("이미 존재하는 CI입니다.");
        }
        
        // 관리자 등록 코드 검증
        String userRole = "CUSTOMER";
        if ("ADMIN".equals(dto.getRole())) {
            if (!"HANA_ADMIN_2024".equals(dto.getAdminCode())) {
                throw new RuntimeException("올바르지 않은 관리자 등록 코드입니다.");
            }
            userRole = "ADMIN";
        }
        
        User user = User.builder()
                .userCi(dto.getUserCi())
                .username(dto.getUsername())
                .password(passwordEncoder.encode(dto.getPassword()))
                .name(dto.getName())
                .email(dto.getEmail())
                .phoneNumber(dto.getPhoneNumber())
                .birthDate(dto.getBirthDate())
                .role(userRole)
                .status("ACTIVE")
                .authType(dto.getAuthType())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        
        userMapper.insertUser(user);
        return user;
    }
    
    public Optional<User> findByUsername(String username) {
        return userMapper.findByUsername(username);
    }
    
    public Optional<User> findByCi(String userCi) {
        return userMapper.findByCi(userCi);
    }
    
    public Optional<User> findByUserCi(String userCi) {
        return userMapper.findByCi(userCi);
    }
    
    public User createUser(User user) {
        userMapper.insertUser(user);
        return user;
    }
    
    @Transactional(readOnly = true)
    public List<User> getAllUsers() {
        return userMapper.findAll();
    }
    
    public void updateUser(User user) {
        userMapper.updateUser(user);
    }
    
    public void deleteUser(String userCi) {
        userMapper.deleteUser(userCi);
    }
    
    public boolean validatePassword(String rawPassword, String encodedPassword) {
        return passwordEncoder.matches(rawPassword, encodedPassword);
    }
}
