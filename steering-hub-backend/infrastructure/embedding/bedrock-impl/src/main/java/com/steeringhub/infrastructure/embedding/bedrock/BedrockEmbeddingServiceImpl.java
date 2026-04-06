package com.steeringhub.infrastructure.embedding.bedrock;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.steeringhub.embedding.EmbeddingService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelRequest;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelResponse;

import java.util.Map;

@Slf4j
@Service
public class BedrockEmbeddingServiceImpl implements EmbeddingService {

    private static final String MODEL_ID = "amazon.titan-embed-text-v2:0";

    private final BedrockRuntimeClient bedrockRuntimeClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${embedding.dimensions:512}")
    private int dimensions;

    public BedrockEmbeddingServiceImpl(BedrockRuntimeClient bedrockRuntimeClient) {
        this.bedrockRuntimeClient = bedrockRuntimeClient;
    }

    @Override
    public float[] embed(String text) {
        try {
            String requestBody = objectMapper.writeValueAsString(
                    Map.of("inputText", text, "dimensions", dimensions, "normalize", true));

            InvokeModelResponse response = bedrockRuntimeClient.invokeModel(
                    InvokeModelRequest.builder()
                            .modelId(MODEL_ID)
                            .contentType("application/json")
                            .accept("application/json")
                            .body(SdkBytes.fromUtf8String(requestBody))
                            .build());

            JsonNode embeddingNode = objectMapper.readTree(response.body().asUtf8String()).get("embedding");
            float[] embedding = new float[embeddingNode.size()];
            for (int i = 0; i < embeddingNode.size(); i++) {
                embedding[i] = (float) embeddingNode.get(i).asDouble();
            }
            return embedding;
        } catch (Exception e) {
            log.error("Failed to generate embedding via Bedrock", e);
            throw new RuntimeException("Embedding generation failed", e);
        }
    }

    @Override
    public float[] embedSteering(String title, String keywords, String tags) {
        StringBuilder sb = new StringBuilder();
        if (title != null) sb.append(title).append("\n");
        if (keywords != null) sb.append(keywords).append("\n");
        if (tags != null) sb.append(tags);
        return embed(sb.toString());
    }
}
