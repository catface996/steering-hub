package com.steeringhub.repository.postgres.typehandler;

import com.steeringhub.domain.model.steering.SteeringStatus;
import org.apache.ibatis.type.BaseTypeHandler;
import org.apache.ibatis.type.JdbcType;
import org.apache.ibatis.type.MappedTypes;

import java.sql.CallableStatement;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

@MappedTypes(SteeringStatus.class)
public class SteeringStatusTypeHandler extends BaseTypeHandler<SteeringStatus> {
    @Override
    public void setNonNullParameter(PreparedStatement ps, int i, SteeringStatus parameter, JdbcType jdbcType) throws SQLException {
        ps.setString(i, parameter.getCode());
    }
    @Override
    public SteeringStatus getNullableResult(ResultSet rs, String columnName) throws SQLException {
        return SteeringStatus.fromCode(rs.getString(columnName));
    }
    @Override
    public SteeringStatus getNullableResult(ResultSet rs, int columnIndex) throws SQLException {
        return SteeringStatus.fromCode(rs.getString(columnIndex));
    }
    @Override
    public SteeringStatus getNullableResult(CallableStatement cs, int columnIndex) throws SQLException {
        return SteeringStatus.fromCode(cs.getString(columnIndex));
    }
}
