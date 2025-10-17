package com.living.hana.service;

import lombok.extern.slf4j.Slf4j;
import net.nurigo.sdk.NurigoApp;
import net.nurigo.sdk.message.model.Message;
import net.nurigo.sdk.message.request.SingleMessageSendingRequest;
import net.nurigo.sdk.message.response.SingleMessageSentResponse;
import net.nurigo.sdk.message.service.DefaultMessageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Cool SMS 인증번호 발송 및 검증 서비스
 */
@Slf4j
@Service
public class SmsService {

    @Value("${coolsms.api.key}")
    private String apiKey;

    @Value("${coolsms.api.secret}")
    private String apiSecret;

    @Value("${coolsms.api.url}")
    private String apiUrl;

    @Value("${coolsms.api.from-number}")
    private String fromNumber;

    private DefaultMessageService messageService;

    // 인증번호 저장 (phoneNumber -> VerificationCode)
    private final Map<String, VerificationCode> verificationCodes = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        try {
            this.messageService = NurigoApp.INSTANCE.initialize(apiKey, apiSecret, apiUrl);
            log.info("Cool SMS 초기화 완료");
        } catch (Exception e) {
            log.error("Cool SMS 초기화 실패: {}", e.getMessage(), e);
        }
    }

    /**
     * 인증번호 발송
     *
     * @param phoneNumber 수신자 휴대폰 번호 (하이픈 제거된 형태)
     * @return 발송 성공 여부
     */
    public boolean sendVerificationCode(String phoneNumber) {
        try {
            // 하이픈 제거
            String cleanPhoneNumber = phoneNumber.replaceAll("-", "");

            // 6자리 인증번호 생성
            String code = generateVerificationCode();

            // SMS 메시지 생성
            Message message = new Message();
            message.setFrom(fromNumber);
            message.setTo(cleanPhoneNumber);
            message.setText(String.format("[하나은행] 인증번호는 [%s]입니다.", code));

            // SMS 발송
            SingleMessageSentResponse response = messageService.sendOne(new SingleMessageSendingRequest(message));
            log.info("SMS 발송 성공: phoneNumber={}, code={}, messageId={}",
                cleanPhoneNumber, code, response.getMessageId());

            // 인증번호 저장 (5분 유효)
            verificationCodes.put(cleanPhoneNumber, new VerificationCode(code, System.currentTimeMillis()));

            // 5분 후 자동 삭제
            scheduleCodeExpiration(cleanPhoneNumber);

            return true;

        } catch (Exception e) {
            log.error("SMS 발송 실패: phoneNumber={}, error={}", phoneNumber, e.getMessage(), e);
            return false;
        }
    }

    /**
     * 인증번호 검증
     *
     * @param phoneNumber 휴대폰 번호
     * @param code        인증번호
     * @return 검증 성공 여부
     */
    public boolean verifyCode(String phoneNumber, String code) {
        try {
            // 하이픈 제거
            String cleanPhoneNumber = phoneNumber.replaceAll("-", "");

            VerificationCode storedCode = verificationCodes.get(cleanPhoneNumber);

            if (storedCode == null) {
                log.warn("인증번호 없음: phoneNumber={}", cleanPhoneNumber);
                return false;
            }

            // 유효시간 체크 (5분)
            long currentTime = System.currentTimeMillis();
            long elapsedTime = currentTime - storedCode.getCreatedAt();
            long fiveMinutes = 5 * 60 * 1000;

            if (elapsedTime > fiveMinutes) {
                log.warn("인증번호 만료: phoneNumber={}", cleanPhoneNumber);
                verificationCodes.remove(cleanPhoneNumber);
                return false;
            }

            // 코드 일치 여부 확인
            boolean isValid = storedCode.getCode().equals(code);

            if (isValid) {
                log.info("인증번호 검증 성공: phoneNumber={}", cleanPhoneNumber);
                // 인증 성공 시 코드 삭제
                verificationCodes.remove(cleanPhoneNumber);
            } else {
                log.warn("인증번호 불일치: phoneNumber={}", cleanPhoneNumber);
            }

            return isValid;

        } catch (Exception e) {
            log.error("인증번호 검증 실패: phoneNumber={}, error={}", phoneNumber, e.getMessage(), e);
            return false;
        }
    }

    /**
     * 6자리 랜덤 인증번호 생성
     */
    private String generateVerificationCode() {
        Random random = new Random();
        int code = 100000 + random.nextInt(900000); // 100000 ~ 999999
        return String.valueOf(code);
    }

    /**
     * 5분 후 인증번호 자동 삭제
     */
    private void scheduleCodeExpiration(String phoneNumber) {
        new Thread(() -> {
            try {
                Thread.sleep(5 * 60 * 1000); // 5분 대기
                verificationCodes.remove(phoneNumber);
                log.info("인증번호 자동 삭제: phoneNumber={}", phoneNumber);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }).start();
    }

    /**
     * 인증번호 정보 저장 클래스
     */
    private static class VerificationCode {
        private final String code;
        private final long createdAt;

        public VerificationCode(String code, long createdAt) {
            this.code = code;
            this.createdAt = createdAt;
        }

        public String getCode() {
            return code;
        }

        public long getCreatedAt() {
            return createdAt;
        }
    }
}
