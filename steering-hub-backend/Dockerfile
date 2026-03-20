FROM maven:3.8.4-openjdk-17 AS build
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests -q

FROM openjdk:17-jre-slim
WORKDIR /app
COPY --from=build /app/app/target/steering-hub-app-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
