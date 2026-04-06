package com.steeringhub.embedding;

public interface EmbeddingService {

    float[] embed(String text);

    float[] embedSteering(String title, String keywords, String tags);
}
