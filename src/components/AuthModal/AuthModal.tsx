import React, { useState } from 'react';
import { Modal, Form, Input, Button, Tabs, message, Space, Typography, Divider } from 'antd';
import { LockOutlined, KeyOutlined, UserOutlined, MobileOutlined, CloseOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/useAuthStore';

const { Text, Title } = Typography;

export const AuthModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [activateForm] = Form.useForm();

  const {
    login,
    register,
    activate,
    isAuthenticated,
    isActivated,
    trialCount,
    maxTrialCount,
    user
  } = useAuthStore();

  const handleLogin = async (values: { phone: string; password: string }) => {
    setLoading(true);
    try {
      const success = await login(values.phone, values.password);
      if (success) {
        message.success('登录成功');
        onClose();
      } else {
        message.error('登录失败，请检查手机号和密码');
      }
    } catch (error) {
      message.error('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: {
    username: string;
    phone: string;
    password: string;
    confirmPassword: string;
  }) => {
    if (values.password !== values.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      const success = await register({
        username: values.username,
        phone: values.phone,
        password: values.password
      });
      
      if (success) {
        message.success('注册成功，请登录');
        setActiveTab('login');
        registerForm.resetFields();
      } else {
        message.error('注册失败，请检查输入信息');
      }
    } catch (error) {
      message.error('注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (values: { code: string }) => {
    if (!isAuthenticated) {
      message.warning('请先登录后再激活');
      setActiveTab('login');
      return;
    }

    setLoading(true);
    try {
      const success = await activate(values.code);
      if (success) {
        message.success('激活成功！您现在可以无限制使用所有功能');
        onClose();
      } else {
        message.error('激活失败，请检查激活码是否正确');
      }
    } catch (error) {
      message.error('激活失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const getModalTitle = () => {
    if (isAuthenticated) {
      if (isActivated) {
        return '账户信息';
      }
      return '激活账户';
    }
    return '登录 / 注册';
  };

  const getModalContent = () => {
    if (isAuthenticated && isActivated) {
      // 已登录且已激活 - 显示账户信息
      return (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Title level={4}>欢迎，{user?.username}</Title>
          <Text type="secondary">{user?.phone}</Text>
          <Divider />
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Text strong>剩余额度：</Text>
              <Text type="success" style={{ fontSize: '24px' }}>
                {user?.remaining_credits}
              </Text>
              <Text> 次</Text>
            </div>
            <div>
              <Text strong>总使用次数：</Text>
              <Text>{user?.total_used} 次</Text>
            </div>
            <Button
              type="primary"
              danger
              onClick={() => {
                useAuthStore.getState().logout();
                onClose();
              }}
            >
              退出登录
            </Button>
          </Space>
        </div>
      );
    }

    // 显示登录/注册/激活选项卡
    return (
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        centered
      >
        <Tabs.TabPane tab="登录" key="login">
          <Form
            form={loginForm}
            onFinish={handleLogin}
            layout="vertical"
          >
            <Form.Item
              name="phone"
              label="手机号"
              rules={[
                { required: true, message: '请输入手机号' },
                { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }
              ]}
            >
              <Input
                prefix={<MobileOutlined />}
                placeholder="请输入手机号"
                size="large"
              />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入密码"
                size="large"
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}
              >
                登录
              </Button>
            </Form.Item>
          </Form>
        </Tabs.TabPane>

        <Tabs.TabPane tab="注册" key="register">
          <Form
            form={registerForm}
            onFinish={handleRegister}
            layout="vertical"
          >
            <Form.Item
              name="username"
              label="用户名"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 3, message: '用户名至少3个字符' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="请输入用户名"
                size="large"
              />
            </Form.Item>
            <Form.Item
              name="phone"
              label="手机号"
              rules={[
                { required: true, message: '请输入手机号' },
                { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }
              ]}
            >
              <Input
                prefix={<MobileOutlined />}
                placeholder="请输入手机号"
                size="large"
              />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入密码"
                size="large"
              />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="确认密码"
              rules={[
                { required: true, message: '请确认密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请再次输入密码"
                size="large"
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}
              >
                注册
              </Button>
            </Form.Item>
          </Form>
        </Tabs.TabPane>

        <Tabs.TabPane tab="激活" key="activate">
          <Form
            form={activateForm}
            onFinish={handleActivate}
            layout="vertical"
          >
            <Form.Item
              name="code"
              label="激活码"
              rules={[{ required: true, message: '请输入激活码' }]}
            >
              <Input
                prefix={<KeyOutlined />}
                placeholder="请输入激活码（如：PD-XXXX-XXXX-XXXX）"
                size="large"
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}
              >
                激活
              </Button>
            </Form.Item>
          </Form>
        </Tabs.TabPane>
      </Tabs>
    );
  };

  return (
    <Modal
      title={getModalTitle()}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={420}
      centered
    >
      {getModalContent()}

      {!isAuthenticated && (
        <>
          <Divider style={{ margin: 'var(--spacing-md) 0' }} />
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              提示：激活后可无限制使用所有功能，未激活用户每天限用{maxTrialCount}次
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
              今日已使用：{trialCount}/{maxTrialCount} 次
            </Text>
          </div>
        </>
      )}
    </Modal>
  );
};