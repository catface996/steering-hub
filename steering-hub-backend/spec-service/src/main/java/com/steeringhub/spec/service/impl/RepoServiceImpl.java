package com.steeringhub.spec.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.steeringhub.spec.entity.Repo;
import com.steeringhub.spec.mapper.RepoMapper;
import com.steeringhub.spec.service.RepoService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RepoServiceImpl extends ServiceImpl<RepoMapper, Repo> implements RepoService {

    @Override
    @Transactional
    public Repo registerRepo(String name, String fullName, String description,
                             String url, String language, String team) {
        Repo existing = getByFullName(fullName);
        if (existing != null) {
            return existing;
        }
        Repo repo = new Repo();
        repo.setName(name);
        repo.setFullName(fullName);
        repo.setDescription(description);
        repo.setUrl(url);
        repo.setLanguage(language);
        repo.setTeam(team);
        repo.setEnabled(true);
        save(repo);
        return repo;
    }

    @Override
    public Repo getByFullName(String fullName) {
        return getOne(new LambdaQueryWrapper<Repo>()
                .eq(Repo::getFullName, fullName)
                .eq(Repo::getEnabled, true));
    }
}
