package com.living.hana.exception;

/**
 * 엔티티 생성 실패 시 발생하는 예외
 */
public class EntityCreationException extends BusinessException {
    
    public EntityCreationException(String entityName) {
        super(entityName + " 생성에 실패했습니다.");
    }
    
    public EntityCreationException(String entityName, Throwable cause) {
        super(entityName + " 생성에 실패했습니다.", cause);
    }
    
    public EntityCreationException(String entityName, String reason) {
        super(String.format("%s 생성에 실패했습니다. 사유: %s", entityName, reason));
    }
}