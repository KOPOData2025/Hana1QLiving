# Java 17 기반 이미지 (Eclipse Temurin)
FROM eclipse-temurin:17-jre

# 작업 디렉토리 설정
WORKDIR /app

# JAR 파일 복사
COPY build/libs/hana-bank-0.0.1-SNAPSHOT.jar app.jar

# 포트 8090 노출
EXPOSE 8090

# 애플리케이션 실행
ENTRYPOINT ["java", "-jar", "app.jar"]