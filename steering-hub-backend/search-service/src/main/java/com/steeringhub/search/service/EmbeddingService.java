package com.steeringhub.search.service;

public interface EmbeddingService {

    /**
     * 调用 Amazon Bedrock Titan Embeddings v2 生成文本的 embedding 向量（512维）
     *
     * @param text 输入文本
     * @return float[] 长度为 512 的向量
     */
    float[] embed(String text);

    /**
     * 将多段文本拼接后生成 embedding（用于规范内容 = title + keywords + tags）
     */
    float[] embedSpec(String title, String keywords, String tags);
}
