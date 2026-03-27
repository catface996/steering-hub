import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Card, Input, Button, Typography, Flex, App } from 'antd';
import { login, isAuthenticated } from '../../utils/auth';
import { RequestError } from '../../utils/request';

export default function LoginPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      message.warning('请输入用户名和密码');
      return;
    }

    setLoading(true);
    try {
      await login({ username, password });
      navigate('/dashboard');
    } catch (err) {
      const msg =
        err instanceof RequestError
          ? err.message
          : '登录失败，请检查用户名和密码';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex align="center" justify="center" style={{ minHeight: '100vh', background: 'var(--bg-deep)' }}>
      <Card style={{ width: 420, padding: 20, background: 'var(--bg-base)', border: '1px solid #27273a', borderRadius: 16 }}>
        {/* Logo */}
        <Flex align="center" justify="center" gap={12} style={{ marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, background: 'var(--primary-color)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography.Title level={4} style={{ margin: 0, color: '#fff' }}>S</Typography.Title>
          </div>
          <Typography.Title level={4} style={{ margin: 0, color: '#a1a1aa' }}>Steering Hub</Typography.Title>
        </Flex>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Typography.Title level={4} style={{ margin: 0, color: '#a1a1aa' }}>欢迎回来</Typography.Title>
          <Typography.Text type="secondary">AI Coding Agent 规范管理平台</Typography.Text>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <Typography.Text style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>用户名</Typography.Text>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              size="large"
              disabled={loading}
              autoComplete="username"
            />
          </div>
          <div>
            <Typography.Text style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>密码</Typography.Text>
            <Input.Password
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              size="large"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            登 录
          </Button>
        </form>
      </Card>
    </Flex>
  );
}
