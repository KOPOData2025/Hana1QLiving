# =============================================================================
# HanaSecurities Spring Boot API - Docker Hub 배포용
# =============================================================================

# Build Stage
FROM eclipse-temurin:17-jdk-alpine AS builder

WORKDIR /app

# Gradle 빌드에 필요한 파일들 복사
COPY gradlew .
COPY gradle gradle/
COPY build.gradle .
COPY settings.gradle .

# 소스 코드 복사
COPY src src/

# Gradle 실행 권한 부여 및 빌드
RUN chmod +x ./gradlew
RUN ./gradlew clean build -x test --no-daemon

# Runtime Stage
FROM eclipse-temurin:17-jre-alpine

# 메타데이터
LABEL maintainer="HanaSecurities Team"
LABEL version="1.0.0"
LABEL description="HanaSecurities API - KIS WebSocket Integration"

# 환경 변수 설정
ENV SPRING_PROFILES_ACTIVE=prod
ENV SERVER_PORT=8093
ENV JAVA_OPTS="-Xms512m -Xmx1024m -XX:+UseG1GC -XX:+UseContainerSupport -XX:MaxRAMPercentage=70.0"

# 필요한 패키지 설치 및 사용자 생성 (Alpine용)
RUN apk add --no-cache \
    curl \
    ca-certificates \
    && addgroup -g 1000 hana \
    && adduser -D -s /bin/sh -u 1000 -G hana hana \
    && mkdir -p /app/logs

WORKDIR /app

# JAR 파일 복사
COPY --from=builder /app/build/libs/*.jar app.jar

# 권한 설정
RUN chown -R hana:hana /app

# 비root 사용자로 실행
USER hana

# 포트 노출
EXPOSE 8093

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD curl -f http://localhost:8093/actuator/health || exit 1

# 실행 명령어
CMD ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]