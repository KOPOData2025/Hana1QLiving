package com.living.hana.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class User implements UserDetails {
    
    private Long id;
    private String password;
    private String name;           // 실명
    private String email;
    private String phone;
    private String beforeAddress;  // 회원가입 시 주소 (이전 주소)
    private String currentAddress; // 현재 주소 (계약 후 오피스텔 주소)
    private String userCi;         // 사용자 CI (Connecting Information)
    private Boolean agreeMarketing; // 마케팅 동의 여부
    private String role; // ROLE_USER, ROLE_ADMIN
    private String status; // ACTIVE, INACTIVE
    private String createdAt;
    private String updatedAt;

    @Override
    public String getUsername() {
        return this.email; // username 대신 email을 반환
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.singletonList(new SimpleGrantedAuthority(role));
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return "ACTIVE".equals(status);
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return "ACTIVE".equals(status);
    }
}
