package com.living.hana.mapper;

import com.living.hana.entity.User;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface UserMapper {

    User findByEmail(String email);
    
    User findByUserCi(String userCi);
    
    User findById(Long id);
    
    List<User> findAll();
    
    int insert(User user);
    
    int update(User user);
    
    int deleteById(Long id);
}
