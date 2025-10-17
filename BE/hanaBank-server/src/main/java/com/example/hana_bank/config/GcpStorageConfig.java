package com.example.hana_bank.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;

@Configuration
public class GcpStorageConfig {

    @Value("${gcp.storage.project-id}")
    private String projectId;

    @Value("${gcp.storage.credentials-file}")
    private String credentialsFile;

    @Bean
    public Storage storage() throws IOException {
        InputStream credentialsStream = new ClassPathResource(credentialsFile).getInputStream();
        GoogleCredentials credentials = GoogleCredentials.fromStream(credentialsStream);
        
        return StorageOptions.newBuilder()
                .setProjectId(projectId)
                .setCredentials(credentials)
                .build()
                .getService();
    }
}