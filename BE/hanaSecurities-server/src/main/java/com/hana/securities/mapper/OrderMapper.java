package com.hana.securities.mapper;

import com.hana.securities.entity.Order;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface OrderMapper {
    
    void insertOrder(Order order);
    
    Order findOrderById(@Param("orderId") String orderId);
    
    List<Order> findOrdersByCustomerId(@Param("customerId") String customerId);
    
    List<Order> findOrdersByStatus(@Param("status") String status);
    
    void updateOrderStatus(
        @Param("orderId") String orderId, 
        @Param("status") String status,
        @Param("executedTime") LocalDateTime executedTime,
        @Param("failureReason") String failureReason
    );
    
    void updateOrder(Order order);
    
    boolean existsByOrderId(@Param("orderId") String orderId);
    
    List<Order> findAllOrders();
    
    int deleteOrder(@Param("orderId") String orderId);
}