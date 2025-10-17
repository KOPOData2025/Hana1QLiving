package com.living.hana.service;

import com.google.cloud.storage.Blob;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class StorageService {

    private final Storage storage;

    @Value("${gcp.storage.bucket-name}")
    private String bucketName;

    /**
     * 이미지 파일을 GCP Cloud Storage에 업로드
     */
    public String uploadImage(MultipartFile file) {
        try {
            String fileName = generateFileName(file.getOriginalFilename());
            BlobId blobId = BlobId.of(bucketName, fileName);
            BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
                    .setContentType(file.getContentType())
                    .build();

            Blob blob = storage.create(blobInfo, file.getBytes());
            String imageUrl = blob.getMediaLink();
            
            log.info("Image uploaded successfully: {} -> {}", fileName, imageUrl);
            return imageUrl;
        } catch (IOException e) {
            log.error("Error uploading image: {}", e.getMessage(), e);
            throw new RuntimeException("이미지 업로드에 실패했습니다.", e);
        }
    }

    /**
     * 여러 이미지 파일을 GCP Cloud Storage에 업로드
     */
    public List<String> uploadImages(List<MultipartFile> files) {
        List<String> imageUrls = new ArrayList<>();
        
        if (files != null && !files.isEmpty()) {
            for (MultipartFile file : files) {
                if (!file.isEmpty()) {
                    String imageUrl = uploadImage(file);
                    imageUrls.add(imageUrl);
                }
            }
        }
        
        return imageUrls;
    }

    /**
     * 이미지 파일 삭제
     */
    public void deleteImage(String imageUrl) {
        try {
            // URL에서 파일명 추출
            String fileName = extractFileNameFromUrl(imageUrl);
            if (fileName != null) {
                BlobId blobId = BlobId.of(bucketName, fileName);
                boolean deleted = storage.delete(blobId);
                
                if (deleted) {
                    log.info("Image deleted successfully: {}", fileName);
                } else {
                    log.warn("Image not found for deletion: {}", fileName);
                }
            }
        } catch (Exception e) {
            log.error("Error deleting image: {}", e.getMessage(), e);
        }
    }

    /**
     * 여러 이미지 파일 삭제
     */
    public void deleteImages(List<String> imageUrls) {
        if (imageUrls != null && !imageUrls.isEmpty()) {
            for (String imageUrl : imageUrls) {
                deleteImage(imageUrl);
            }
        }
    }

    /**
     * 고유한 파일명 생성
     */
    private String generateFileName(String originalFileName) {
        String extension = "";
        if (originalFileName != null && originalFileName.contains(".")) {
            extension = originalFileName.substring(originalFileName.lastIndexOf("."));
        }
        return "buildings/" + UUID.randomUUID() + extension;
    }

    /**
     * URL에서 파일명 추출
     */
    private String extractFileNameFromUrl(String imageUrl) {
        try {
            // GCP Cloud Storage URL에서 파일명 추출
            if (imageUrl.contains("/o/")) {
                String[] parts = imageUrl.split("/o/");
                if (parts.length > 1) {
                    String fileName = parts[1];
                    if (fileName.contains("?")) {
                        fileName = fileName.split("\\?")[0];
                    }
                    return java.net.URLDecoder.decode(fileName, StandardCharsets.UTF_8);
                }
            }
        } catch (Exception e) {
            log.error("Error extracting filename from URL: {}", e.getMessage(), e);
        }
        return null;
    }
}
