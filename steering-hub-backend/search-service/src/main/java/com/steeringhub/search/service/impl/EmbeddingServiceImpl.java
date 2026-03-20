package com.steeringhub.search.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.steeringhub.common.exception.BusinessException;
import com.steeringhub.common.response.ResultCode;
import com.steeringhub.search.service.EmbeddingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelRequest;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelResponse;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmbeddingServiceImpl implements EmbeddingService {

    private static final String TITAN_EMBEDDING_MODEL_ID = "amazon.titan-embed-text-v2:0";

    private final BedrockRuntimeClient bedrockRuntimeClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${embedding.dimensions:512}")
    private int dimensions;

    @Override
    public float[] embed(String text) {
        try {
            String requestBody = objectMapper.writeValueAsString(
                    new java.util.HashMap<String, Object>() {{
                        put("inputText", text);
                        put("dimensions", dimensions);
                        put("normalize", true);
                    }}
            );

            InvokeModelRequest request = InvokeModelRequest.builder()
                    .modelId(TITAN_EMBEDDING_MODEL_ID)
                    .contentType("application/json")
                    .accept("application/json")
                    .body(SdkBytes.fromUtf8String(requestBody))
                    .build();

            InvokeModelResponse response = bedrockRuntimeClient.invokeModel(request);
            String responseBody = response.body().asUtf8String();

            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode embeddingNode = root.get("embedding");

            float[] embedding = new float[embeddingNode.size()];
            for (int i = 0; i < embeddingNode.size(); i++) {
                embedding[i] = (float) embeddingNode.get(i).asDouble();
            }
            return embedding;

        } catch (Exception e) {
            log.error("Failed to generate embedding via Bedrock", e);
            throw new BusinessException(ResultCode.EMBEDDING_FAILED);
        }
    }

    @Override
    public float[] embedSpec(String title, String keywords, String tags) {
        StringBuilder sb = new StringBuilder();
        if (title != null) sb.append(title).append("\n");
        if (keywords != null) sb.append(keywords).append("\n");
        if (tags != null) sb.append(tags);
        return embed(sb.toString());
    }
}
