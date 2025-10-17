package com.living.hana.controller;

import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class FileUploadController {

    private final Storage storage;

    @Value("${gcp.storage.bucket-name}")
    private String bucketName;

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadFile(@RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();

        try {
            if (file.isEmpty()) {
                response.put("success", false);
                response.put("message", "파일이 비어있습니다.");
                return ResponseEntity.badRequest().body(response);
            }

            // 파일명 생성 (UUID + 원본 파일명)
            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf("."))
                : "";
            String fileName = "contracts/" + UUID.randomUUID() + extension;

            // GCS에 파일 업로드
            BlobId blobId = BlobId.of(bucketName, fileName);
            BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
                    .setContentType(file.getContentType())
                    .build();

            storage.create(blobInfo, file.getBytes());

            // 공개 URL 생성
            String fileUrl = String.format("https://storage.googleapis.com/%s/%s", bucketName, fileName);

            log.info("파일 업로드 성공: {}", fileUrl);

            Map<String, String> data = new HashMap<>();
            data.put("url", fileUrl);
            data.put("fileName", originalFilename);

            response.put("success", true);
            response.put("message", "파일 업로드 성공");
            response.put("data", data);

            return ResponseEntity.ok(response);

        } catch (IOException e) {
            log.error("파일 업로드 실패: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "파일 업로드에 실패했습니다: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
}
