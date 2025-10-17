package com.living.hana.mapper;

import com.living.hana.entity.Building;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface BuildingMapper {
    
    List<Building> findAll();
    
    Building findById(Long id);
    
    Building findByName(String name);
    
    List<Building> findByStatus(String status);
    
    int insert(Building building);
    
    int update(Building building);
    
    int deleteById(Long id);
}
