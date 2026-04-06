package com.steeringhub.repository;

import com.steeringhub.common.response.PageResult;
import com.steeringhub.domain.model.repo.Repo;
import com.steeringhub.repository.query.RepoQuery;

public interface RepoRepository {

    Repo getById(Long id);

    PageResult<Repo> page(RepoQuery query, int page, int size);

    Repo findByFullNameIncludeDeleted(String fullName);

    Repo findEnabledByFullName(String fullName);

    void save(Repo repo);

    void update(Repo repo);

    void deleteById(Long id);
}
