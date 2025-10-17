# Multi-stage build로 크기 최적화
FROM openjdk:17-jdk-slim AS builder

WORKDIR /app

# Gradle 빌드에 필요한 파일들만 복사
COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .
COPY src src

RUN chmod +x ./gradlew
RUN ./gradlew build -x test

# Runtime 이미지 (더 작은 JRE 사용)
FROM eclipse-temurin:17-jre

WORKDIR /app

# 시간대 설정
ENV TZ=Asia/Seoul
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# OpenTelemetry Java Agent 다운로드
ADD https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar opentelemetry-javaagent.jar

# 빌드된 JAR 파일만 복사
COPY --from=builder /app/build/libs/hana-0.0.1-SNAPSHOT.jar app.jar

# 포트 노출
EXPOSE 8091

# 애플리케이션 실행
CMD ["java", "-javaagent:opentelemetry-javaagent.jar", \
     "-Dotel.service.name=hana-oneqliving", \
     "-Dotel.exporter.otlp.endpoint=http://34.63.8.58:4318", \
     "-Dotel.exporter.otlp.protocol=http/protobuf", \
     "-Dotel.logs.exporter=otlp", \
     "-Dotel.metrics.exporter=otlp", \
     "-Dotel.traces.exporter=otlp", \
     "-jar", "app.jar"]