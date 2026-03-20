package com.steeringhub.spec.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.steeringhub.spec.entity.Repo;

public interface RepoService extends IService<Repo> {

    Repo registerRepo(String name, String fullName, String description, String url, String language, String team);

    Repo getByFullName(String fullName);
}
