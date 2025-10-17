package com.living.hana.exception;

/**
 * 엔티티를 찾을 수 없을 때 발생하는 예외
 */
public class EntityNotFoundException extends BusinessException {
    
    public EntityNotFoundException(String entityName) {
        super(entityName + "을(를) 찾을 수 없습니다.");
    }
    
    public EntityNotFoundException(String entityName, Object identifier) {
        super(String.format("%s을(를) 찾을 수 없습니다. (식별자: %s)", entityName, identifier));
    }
}