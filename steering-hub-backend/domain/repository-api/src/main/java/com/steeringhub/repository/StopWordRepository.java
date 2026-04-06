package com.steeringhub.repository;

import com.steeringhub.domain.model.search.StopWord;

import java.util.List;

public interface StopWordRepository {

    List<StopWord> findAllEnabled();

    List<StopWord> findAllOrderByWord();

    void save(StopWord stopWord);

    StopWord getById(Long id);

    void update(StopWord stopWord);

    void deleteById(Long id);
}
