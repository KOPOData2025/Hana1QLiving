package com.hana.securities.exception;

/**
 * 데이터베이스 관련 예외
 */
public class DatabaseException extends BusinessException {
    
    public DatabaseException(String message) {
        super(message);
    }
    
    public DatabaseException(String message, Throwable cause) {
        super(message, cause);
    }
    
    public static DatabaseException connectionFailed() {
        return new DatabaseException("데이터베이스 연결에 실패했습니다.");
    }
    
    public static DatabaseException queryExecutionFailed(String query, Throwable cause) {
        return new DatabaseException("쿼리 실행에 실패했습니다: " + query, cause);
    }
    
    public static DatabaseException dataIntegrityViolation(String reason) {
        return new DatabaseException("데이터 무결성 위반: " + reason);
    }
    
    public static DatabaseException transactionFailed(String operation) {
        return new DatabaseException("트랜잭션 실행 실패: " + operation);
    }
}