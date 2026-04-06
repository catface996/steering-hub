package com.steeringhub.security;

public interface ApiKeyService {

    boolean validate(String apiKey);
}
