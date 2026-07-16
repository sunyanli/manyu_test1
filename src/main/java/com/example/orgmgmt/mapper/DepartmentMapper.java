package com.example.orgmgmt.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.orgmgmt.entity.Department;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface DepartmentMapper extends BaseMapper<Department> {

    /**
     * 查询自身及所有子孙部门
     */
    @Select("SELECT * FROM departments WHERE path LIKE CONCAT(#{path}, '-%') OR id = #{id}")
    List<Department> selectChildrenAndSelf(@Param("id") Long id, @Param("path") String path);

    /**
     * 查询所有子孙部门
     */
    @Select("SELECT * FROM departments WHERE path LIKE CONCAT(#{path}, '-%')")
    List<Department> selectDescendants(@Param("path") String path);
}