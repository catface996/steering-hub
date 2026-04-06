package com.steeringhub.repository;

import com.steeringhub.domain.model.search.StopWord;

import java.util.List;

public interface StopWordRepository {

    List<StopWord> findAllEnabled();

    List<StopWord> findAllOrderByWord();
}
