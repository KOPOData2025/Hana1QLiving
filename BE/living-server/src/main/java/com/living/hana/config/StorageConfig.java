package com.living.hana.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;

@Configuration
@Slf4j
public class StorageConfig {

    @Value("${gcp.storage.project-id}")
    private String projectId;

    @Value("${gcp.storage.credentials-file}")
    private String credentialsFile;

    @Bean
    public Storage storage() {
        try {
            log.info("GCP Cloud Storage 설정 시작");
            log.info("Project ID: {}", projectId);
            log.info("Credentials file: {}", credentialsFile);
            
            // GCP 서비스 계정 키 파일 로드
            ClassPathResource resource = new ClassPathResource(credentialsFile);
            log.info("ClassPathResource 생성됨: {}", resource.getPath());
            log.info("ClassPathResource 존재 여부: {}", resource.exists());
            
            if (!resource.exists()) {
                log.error("GCP 인증 파일을 찾을 수 없습니다: {}", credentialsFile);
                log.error("현재 작업 디렉토리: {}", System.getProperty("user.dir"));
                throw new RuntimeException("GCP 인증 파일을 찾을 수 없습니다: " + credentialsFile);
            }
            
            log.info("인증 파일 존재 확인됨: {}", resource.getFilename());
            log.info("파일 크기: {} bytes", resource.contentLength());
            
            InputStream credentialsStream = resource.getInputStream();
            GoogleCredentials credentials = GoogleCredentials.fromStream(credentialsStream);
            
            log.info("GCP 인증 정보 로드 성공");

            Storage storage = StorageOptions.newBuilder()
                    .setProjectId(projectId)
                    .setCredentials(credentials)
                    .build()
                    .getService();
            
            log.info("GCP Cloud Storage 클라이언트 생성 성공");
            return storage;
            
        } catch (IOException e) {
            log.error("GCP Cloud Storage 설정에 실패했습니다: {}", e.getMessage(), e);
            throw new RuntimeException("GCP Cloud Storage 설정에 실패했습니다.", e);
        } catch (Exception e) {
            log.error("예상치 못한 오류가 발생했습니다: {}", e.getMessage(), e);
            throw new RuntimeException("GCP Cloud Storage 설정 중 예상치 못한 오류가 발생했습니다.", e);
        }
    }
}
