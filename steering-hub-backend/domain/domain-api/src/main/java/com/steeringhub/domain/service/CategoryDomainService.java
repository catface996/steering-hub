package com.steeringhub.domain.service;

/**
 * 分类 DAG 校验：环检测、父节点合法性。
 * 纯业务规则，不含事务、不含 DTO。
 */
public interface CategoryDomainService {

    /**
     * 检测添加 parentId → childId 关系后是否形成环。
     * 若检测到环或自环，抛出 BusinessException。
     */
    void validateHierarchy(Long parentId, Long childId);

    /**
     * 校验分类编码唯一性。若已存在，抛出 BusinessException。
     */
    void validateCodeUnique(String code);
}
