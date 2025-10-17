package com.living.hana.service;

import com.living.hana.annotation.Logging;
import com.living.hana.entity.User;
import com.living.hana.exception.BusinessException;
import com.living.hana.mapper.UserMapper;
import com.living.hana.util.DateTimeUtils;
import com.living.hana.util.EntityValidator;
import com.living.hana.util.StringUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class UserService implements UserDetailsService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final TransactionTemplate transactionTemplate;
    private final EntityValidator entityValidator;

    @Override
    public UserDetails loadUserByUsername(String userCi) throws UsernameNotFoundException {
        User user = userMapper.findByUserCi(userCi);
        if (user == null) {
            throw new UsernameNotFoundException("사용자를 찾을 수 없습니다: " + userCi);
        }
        return user;
    }



    public User findByEmail(String email) {
        return userMapper.findByEmail(email);
    }

    public User findById(Long id) {
        return userMapper.findById(id);
    }

    public List<User> findAll() {
        return userMapper.findAll();
    }

    @Logging(operation = "사용자 생성", category = "USER", maskSensitive = true)
    @Transactional
    public User createUser(User user) {
        return transactionTemplate.execute(status -> {
            try {
                // 입력값 검증 및 기본값 설정
                entityValidator.validateUserInput(user);
                prepareUserForCreation(user);

                // 데이터베이스에 저장
                int insertResult = userMapper.insert(user);

                if (insertResult > 0) {
                    status.flush();
                    return refetchCreatedUser(user.getEmail());
                } else {
                    status.setRollbackOnly();
                    throw new RuntimeException("사용자 생성에 실패했습니다.");
                }
            } catch (Exception e) {
                status.setRollbackOnly();
                throw e;
            }
        });
    }
    
    /**
     * 사용자 생성을 위한 데이터 준비
     */
    private void prepareUserForCreation(User user) {
        // 비밀번호 암호화
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        
        // 시스템 설정값
        user.setRole("ROLE_USER");
        user.setStatus("ACTIVE");
        
        // 타임스탬프 설정
        String currentTime = DateTimeUtils.getCurrentTimestamp();
        user.setCreatedAt(currentTime);
        user.setUpdatedAt(currentTime);
        
        // 기본값 설정 및 검증
        entityValidator.validateAndSetDefaults(user);
        
        // userCi 생성
        if (StringUtils.isBlank(user.getUserCi())) {
            String userCi = generateUserCi(user.getName(), user.getEmail());
            user.setUserCi(userCi);
        }
    }

    /**
     * 생성된 사용자 정보 재조회
     */
    private User refetchCreatedUser(String email) {
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        User createdUser = userMapper.findByEmail(email);
        if (createdUser != null) {
            return createdUser;
        } else {
            log.warn("User created but failed to re-fetch: {}", email);
            // 재조회 실패 시 기본 사용자 객체 반환 (ID는 0으로 설정)
            User fallbackUser = new User();
            fallbackUser.setId(0L);
            fallbackUser.setEmail(email);
            return fallbackUser;
        }
    }

    @Logging(operation = "사용자 정보 수정", category = "USER", maskSensitive = true)
    @Transactional
    public void updateUser(User user) {
        prepareUserForUpdate(user);

        int updateResult = userMapper.update(user);
        if (updateResult == 0) {
            throw new BusinessException("사용자 정보 수정에 실패했습니다.");
        }
    }
    
    /**
     * 사용자 업데이트를 위한 데이터 준비
     */
    private void prepareUserForUpdate(User user) {
        // 비밀번호가 제공된 경우에만 암호화
        if (StringUtils.isNotBlank(user.getPassword())) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }
        
        // 업데이트 시간 설정
        user.setUpdatedAt(DateTimeUtils.getCurrentTimestamp());
        
        // 기본값 설정 (업데이트용)
        entityValidator.validateAndSetDefaults(user);
    }


    @Logging(operation = "사용자 인증", category = "USER", maskSensitive = true)
    public boolean authenticateUser(String email, String password) {
        User user = userMapper.findByEmail(email);
        if (user != null) {
            return passwordEncoder.matches(password, user.getPassword());
        }
        return false;
    }

    /**
     * 기존 사용자들의 userCi 업데이트
     */
    @Logging(operation = "UserCi 일괄 업데이트", category = "USER", maskSensitive = false)
    @Transactional
    public void updateMissingUserCi() {
        List<User> allUsers = userMapper.findAll();
        int updatedCount = 0;

        for (User user : allUsers) {
            if (user.getUserCi() == null || user.getUserCi().trim().isEmpty()) {
                String userCi = generateUserCi(user.getName(), user.getEmail());
                user.setUserCi(userCi);
                user.setUpdatedAt(DateTimeUtils.getCurrentTimestamp());
                userMapper.update(user);
                updatedCount++;
            }
        }
    }

    /**
     * 잘못된 형태의 userCi (이메일 등)를 올바른 형태로 수정
     */
    @Logging(operation = "UserCi 형식 수정", category = "USER", maskSensitive = false)
    @Transactional
    public void fixInvalidUserCi() {
        List<User> allUsers = userMapper.findAll();
        int fixedCount = 0;

        for (User user : allUsers) {
            String userCi = user.getUserCi();
            // userCi가 이메일 형태이거나 CI로 시작하지 않는 경우
            if (userCi != null &&
                (userCi.contains("@") || !userCi.startsWith("CI"))) {

                String newUserCi = generateUserCi(user.getName(), user.getEmail());
                user.setUserCi(newUserCi);
                user.setUpdatedAt(DateTimeUtils.getCurrentTimestamp());
                userMapper.update(user);
                fixedCount++;
            }
        }
    }
    
    /**
     * 사용자 CI(Customer Identification) 생성
     * 실제 운영에서는 더 안전한 암호화 방식을 사용해야 함
     */
    private String generateUserCi(String name, String email) {
        try {
            // 이름과 이메일을 조합하여 해시CI 생성
            String combined = name + "_" + email + "_" + System.currentTimeMillis();
            return "CI" + Math.abs(combined.hashCode());
        } catch (Exception e) {
            log.warn("Error generating userCi, using fallback: {}", e.getMessage());
            // 폴백: 현재 시간 기반 CI 생성
            return "CI" + System.currentTimeMillis();
        }
    }
}
