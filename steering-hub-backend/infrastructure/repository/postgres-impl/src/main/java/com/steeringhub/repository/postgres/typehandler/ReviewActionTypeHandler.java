package com.steeringhub.repository.postgres.typehandler;

import com.steeringhub.domain.model.steering.ReviewAction;
import org.apache.ibatis.type.BaseTypeHandler;
import org.apache.ibatis.type.JdbcType;
import org.apache.ibatis.type.MappedTypes;

import java.sql.CallableStatement;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

@MappedTypes(ReviewAction.class)
public class ReviewActionTypeHandler extends BaseTypeHandler<ReviewAction> {
    @Override
    public void setNonNullParameter(PreparedStatement ps, int i, ReviewAction parameter, JdbcType jdbcType) throws SQLException {
        ps.setString(i, parameter.getCode());
    }
    @Override
    public ReviewAction getNullableResult(ResultSet rs, String columnName) throws SQLException {
        return ReviewAction.fromCode(rs.getString(columnName));
    }
    @Override
    public ReviewAction getNullableResult(ResultSet rs, int columnIndex) throws SQLException {
        return ReviewAction.fromCode(rs.getString(columnIndex));
    }
    @Override
    public ReviewAction getNullableResult(CallableStatement cs, int columnIndex) throws SQLException {
        return ReviewAction.fromCode(cs.getString(columnIndex));
    }
}
