package com.example.hana_bank.mapper;

import com.example.hana_bank.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface UserMapper {
    
    void insertUser(User user);
    
    Optional<User> findByUsername(@Param("username") String username);
    
    Optional<User> findByCi(@Param("userCi") String userCi);
    
    List<User> findAll();
    
    void updateUser(User user);
    
    void deleteUser(@Param("userCi") String userCi);
    
    boolean existsByUsername(@Param("username") String username);
    
    boolean existsByEmail(@Param("email") String email);
    
    boolean existsByCi(@Param("userCi") String userCi);
}
