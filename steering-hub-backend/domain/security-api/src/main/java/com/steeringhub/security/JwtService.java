package com.steeringhub.security;

public interface JwtService {

    String generateToken(Long userId, String username, String role);

    String extractUsername(String token);

    Long extractUserId(String token);

    String extractRole(String token);

    boolean validateToken(String token);
}
