package com.living.hana.mapper;

import com.living.hana.entity.Unit;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface UnitMapper {
    
    List<Unit> findAll();
    
    Unit findById(Long id);
    
    List<Unit> findByBuildingId(Long buildingId);
    
    Unit findByBuildingIdAndUnitNumber(@Param("buildingId") Long buildingId, @Param("unitNumber") String unitNumber);
    
    List<Unit> findByStatus(String status);
    
    List<Unit> findAvailableUnits();
    
    int insert(Unit unit);
    
    int update(Unit unit);
    
    int deleteById(Long id);
}
