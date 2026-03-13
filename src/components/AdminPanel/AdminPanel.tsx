import React, { useState, useEffect } from 'react';
import { Card, Layout, Menu, Tabs, Table, Button, Input, Form, Select, message, Modal, Popconfirm, Tag, Badge, DatePicker, Statistic, Row, Col, Progress, Spin } from 'antd';
import { UserOutlined, KeyOutlined, BarChartOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, EyeOutlined, ArrowLeftOutlined, BgColorsOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { adminAPI, authAPI } from '../../services/api';
import { useAuthStore } from '../../stores/useAuthStore';
import { PaletteManager } from './PaletteManager';
import styles from './AdminPanel.module.css';

const { Header, Content, Sider } = Layout;
const { TabPane } = Tabs;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface User {
  id: string;
  username: string;
  email: string;
  phone: string;
  is_active: boolean;
  is_verified: boolean;
  remaining_credits: number;
  total_used: number;
  created_at: string;
  last_used_at: string;
}

interface ActivationCode {
  id: string;
  code: string;
  code_type: string;
  credits: number;
  validity_days: number;
  is_used: boolean;
  used_by: string;
  used_at: string;
  created_at: string;
  expires_at: string;
}

interface Stats {
  total_users: number;
  active_users: number;
  total_activation_codes: number;
  used_activation_codes: number;
  total_credits_used: number;
  avg_credits_per_user: number;
  monthly_stats: any[];
}

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<User[]>([]);
  const [activationCodes, setActivationCodes] = useState<ActivationCode[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [creditModalVisible, setCreditModalVisible] = useState(false);
  const [newCredits, setNewCredits] = useState(0);
  const [codeCount, setCodeCount] = useState(10);
  const [codeType, setCodeType] = useState('trial');
  const [codeCredits, setCodeCredits] = useState(10);
  const [codeValidity, setCodeValidity] = useState(7);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [addUserModalVisible, setAddUserModalVisible] = useState(false);
  const [addUserForm] = Form.useForm();
  const [isInitializing, setIsInitializing] = useState(true);
  
  const { adminToken, adminLogin, adminLogout, isAdmin } = useAuthStore();

  // 监听 auth store 的登录状态变化
  useEffect(() => {
    try {
      const loggedIn = !!adminToken || isAdmin;
      setIsLoggedIn(loggedIn);
      
      // 如果登录了，加载数据
      if (loggedIn) {
        loadUsers();
        loadActivationCodes();
        loadStats();
      }
    } catch (error) {
      console.error('Admin panel initialization error:', error);
    } finally {
      // 初始化完成
      setIsInitializing(false);
    }
  }, [adminToken, isAdmin]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.listUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Load users error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivationCodes = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.listActivationCodes();
      setActivationCodes(response.data);
    } catch (error) {
      console.error('Load activation codes error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await adminAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  const handleGenerateCodes = async (values: any) => {
    try {
      setGeneratingCodes(true);
      const response = await adminAPI.generateActivationCodes({
        count: values.count || codeCount,
        code_type: values.type || codeType,
        credits: values.credits || codeCredits,
        validity_days: values.validity || codeValidity
      });
      message.success(`成功生成 ${response.data.length} 个激活码`);
      loadActivationCodes();
    } catch (error) {
      message.error('生成激活码失败');
      console.error('Generate codes error:', error);
    } finally {
      setGeneratingCodes(false);
    }
  };

  const handleUpdateCredits = async () => {
    if (!editingUser) return;
    
    try {
      setLoading(true);
      await adminAPI.manageUserCredits(editingUser.id, {
        credits: newCredits,
        action: 'set'
      });
      message.success('用户额度更新成功');
      setCreditModalVisible(false);
      setEditingUser(null);
      setNewCredits(0);
      loadUsers();
    } catch (error) {
      message.error('更新用户额度失败');
      console.error('Update credits error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      setLoading(true);
      await adminAPI.resetUserPassword(userId);
      message.success('密码重置成功');
    } catch (error) {
      message.error('密码重置失败');
      console.error('Reset password error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      setLoading(true);
      await adminAPI.deactivateUser(userId);
      message.success('用户已禁用');
      loadUsers();
    } catch (error) {
      message.error('禁用用户失败');
      console.error('Deactivate user error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (values: any) => {
    try {
      setLoading(true);
      await adminAPI.createUser({
        username: values.username,
        phone: values.phone,
        password: values.password,
        email: values.email,
      });
      message.success('用户添加成功');
      setAddUserModalVisible(false);
      addUserForm.resetFields();
      loadUsers();
    } catch (error) {
      message.error('添加用户失败');
      console.error('Add user error:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<User> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (is_active) => (
        <Tag color={is_active ? 'green' : 'red'}>
          {is_active ? '活跃' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '剩余额度',
      dataIndex: 'remaining_credits',
      key: 'remaining_credits',
      render: (credits) => (
        <Badge count={credits} showZero color={credits > 0 ? 'blue' : 'red'} />
      ),
    },
    {
      title: '总使用次数',
      dataIndex: 'total_used',
      key: 'total_used',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time) => new Date(time).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <div className={styles.actionButtons}>
          <Button 
            type="primary" 
            size="small" 
            onClick={() => {
              setEditingUser(record);
              setNewCredits(record.remaining_credits);
              setCreditModalVisible(true);
            }}
          >
            调整额度
          </Button>
          <Button 
            size="small" 
            onClick={() => handleResetPassword(record.id)}
          >
            重置密码
          </Button>
          <Popconfirm
            title="确定要禁用该用户吗？"
            onConfirm={() => handleDeactivateUser(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              danger 
              size="small"
            >
              禁用
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const codeColumns: ColumnsType<ActivationCode> = [
    {
      title: '激活码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '类型',
      dataIndex: 'code_type',
      key: 'code_type',
      render: (type) => {
        const typeMap: Record<string, { color: string; text: string }> = {
          trial: { color: 'blue', text: '试用' },
          monthly: { color: 'green', text: '月卡' },
          yearly: { color: 'orange', text: '年卡' },
          permanent: { color: 'purple', text: '永久' },
        };
        const config = typeMap[type] || { color: 'default', text: type };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '额度',
      dataIndex: 'credits',
      key: 'credits',
    },
    {
      title: '有效期',
      dataIndex: 'validity_days',
      key: 'validity_days',
      render: (days) => days ? `${days}天` : '永久',
    },
    {
      title: '状态',
      dataIndex: 'is_used',
      key: 'is_used',
      render: (is_used) => (
        <Tag color={is_used ? 'red' : 'green'}>
          {is_used ? '已使用' : '未使用'}
        </Tag>
      ),
    },
    {
      title: '使用时间',
      dataIndex: 'used_at',
      key: 'used_at',
      render: (time) => time ? new Date(time).toLocaleString() : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time) => new Date(time).toLocaleString(),
    },
  ];

  if (isInitializing) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>
          <Spin size="large" />
          <Text style={{ marginTop: 16, display: 'block' }}>加载中...</Text>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className={styles.loginContainer}>
        <Card 
          title="管理员登录" 
          className={styles.loginCard}
          extra={
            <Button 
              type="link" 
              icon={<ArrowLeftOutlined />}
              onClick={() => window.location.href = '/'}
            >
              返回主页
            </Button>
          }
        >
          <Form
            onFinish={async (values) => {
              try {
                setLoading(true);
                const success = await adminLogin(values.username, values.password);
                if (success) {
                  message.success('登录成功');
                } else {
                  message.error('登录失败，请检查用户名和密码');
                }
              } catch (error) {
                message.error('登录请求失败，请稍后重试');
                console.error('Login error:', error);
              } finally {
                setLoading(false);
              }
            }}
          >
            <Form.Item
              name="username"
              label="用户名"
              labelCol={{ span: 6 }}
              wrapperCol={{ span: 18 }}
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input placeholder="请输入管理员用户名" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              labelCol={{ span: 6 }}
              wrapperCol={{ span: 18 }}
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="请输入管理员密码" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
              <Button type="primary" htmlType="submit" block loading={loading}>
                登录
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    );
  }

  return (
    <Layout className={styles.container}>
      <Header className={styles.header}>
        <div className={styles.headerTitle}>拼豆图纸生成器 - 管理后台</div>
        <Button onClick={adminLogout} className={styles.logoutButton}>
          退出登录
        </Button>
      </Header>
      <Layout>
        <Sider width={200} className={styles.sider}>
          <Menu
            mode="inline"
            selectedKeys={[activeTab]}
            onSelect={({ key }) => setActiveTab(key as string)}
            style={{ height: '100%', borderRight: 0 }}
            items={[
              {
                key: 'users',
                icon: <UserOutlined />,
                label: '用户管理',
              },
              {
                key: 'activation',
                icon: <KeyOutlined />,
                label: '激活码管理',
              },
              {
                key: 'palettes',
                icon: <BgColorsOutlined />,
                label: '色库管理',
              },
              {
                key: 'stats',
                icon: <BarChartOutlined />,
                label: '统计信息',
              },
            ]}
          />
        </Sider>
        <Content className={styles.content}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'users',
                label: '用户管理',
                children: (
                  <Card
                    title="用户列表"
                    extra={
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddUserModalVisible(true)}>
                          添加用户
                        </Button>
                        <Button onClick={loadUsers} icon={<ReloadOutlined />}>
                          刷新
                        </Button>
                      </div>
                    }
                  >
                    <Table
                      columns={columns}
                      dataSource={users}
                      rowKey="id"
                      loading={loading}
                      pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                      }}
                    />
                  </Card>
                ),
              },
              {
                key: 'activation',
                label: '激活码管理',
                children: (
                  <Card
                    title="激活码管理"
                    extra={
                      <Button onClick={loadActivationCodes} icon={<ReloadOutlined />}>
                        刷新
                      </Button>
                    }
                  >
                    <Card className={styles.generateCard}>
                      <h3>生成激活码</h3>
                      <Form layout="inline" onFinish={handleGenerateCodes}>
                        <Form.Item
                          name="count"
                          label="数量"
                          rules={[{ required: true, message: '请输入数量' }]}
                        >
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={codeCount}
                            onChange={(e) => setCodeCount(Number(e.target.value))}
                          />
                        </Form.Item>
                        <Form.Item
                          name="type"
                          label="类型"
                          rules={[{ required: true, message: '请选择类型' }]}
                        >
                          <Select
                            value={codeType}
                            onChange={setCodeType}
                          >
                            <Option value="trial">试用</Option>
                            <Option value="monthly">月卡</Option>
                            <Option value="yearly">年卡</Option>
                            <Option value="permanent">永久</Option>
                          </Select>
                        </Form.Item>
                        <Form.Item
                          name="credits"
                          label="额度"
                          rules={[{ required: true, message: '请输入额度' }]}
                        >
                          <Input
                            type="number"
                            min={1}
                            value={codeCredits}
                            onChange={(e) => setCodeCredits(Number(e.target.value))}
                          />
                        </Form.Item>
                        <Form.Item
                          name="validity"
                          label="有效期(天)"
                          rules={[{ required: true, message: '请输入有效期' }]}
                        >
                          <Input
                            type="number"
                            min={1}
                            value={codeValidity}
                            onChange={(e) => setCodeValidity(Number(e.target.value))}
                          />
                        </Form.Item>
                        <Form.Item>
                          <Button
                            type="primary"
                            htmlType="submit"
                            loading={generatingCodes}
                          >
                            生成
                          </Button>
                        </Form.Item>
                      </Form>
                    </Card>
                    <Table
                      columns={codeColumns}
                      dataSource={activationCodes}
                      rowKey="id"
                      loading={loading}
                      pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                      }}
                    />
                  </Card>
                ),
              },
              {
                key: 'stats',
                label: '统计信息',
                children: (
                  <Card title="系统统计">
                    {stats ? (
                      <>
                        <Row gutter={[16, 16]}>
                          <Col span={6}>
                            <Statistic title="总用户数" value={stats.total_users} />
                          </Col>
                          <Col span={6}>
                            <Statistic title="活跃用户" value={stats.active_users} />
                          </Col>
                          <Col span={6}>
                            <Statistic title="总激活码" value={stats.total_activation_codes} />
                          </Col>
                          <Col span={6}>
                            <Statistic title="已使用激活码" value={stats.used_activation_codes} />
                          </Col>
                        </Row>
                        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                          <Col span={12}>
                            <Card>
                              <Statistic title="总使用额度" value={stats.total_credits_used} />
                            </Card>
                          </Col>
                          <Col span={12}>
                            <Card>
                              <Statistic title="平均用户额度" value={stats.avg_credits_per_user.toFixed(2)} />
                            </Card>
                          </Col>
                        </Row>
                        <Card style={{ marginTop: 16 }}>
                          <h3>月度使用统计</h3>
                          {stats.monthly_stats.map((item, index) => (
                            <div key={index} style={{ marginBottom: 12 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span>{item.month}</span>
                                <span>{item.usage} 次</span>
                              </div>
                              <Progress percent={(item.usage / 100) * 100} />
                            </div>
                          ))}
                        </Card>
                      </>
                    ) : (
                      <div className={styles.loading}>
                        <Button onClick={loadStats} icon={<ReloadOutlined />}>
                          加载统计信息
                        </Button>
                      </div>
                    )}
                  </Card>
                ),
              },
              {
                key: 'palettes',
                label: '色库管理',
                children: <PaletteManager />,
              },
            ]}
          />
        </Content>
      </Layout>

      <Modal
        title="调整用户额度"
        open={creditModalVisible}
        onOk={handleUpdateCredits}
        onCancel={() => setCreditModalVisible(false)}
        loading={loading}
      >
        <Form>
          <Form.Item
            label="用户"
            name="username"
          >
            <Input value={editingUser?.username} disabled />
          </Form.Item>
          <Form.Item
            label="当前额度"
            name="currentCredits"
          >
            <Input value={editingUser?.remaining_credits} disabled />
          </Form.Item>
          <Form.Item
            label="新额度"
            name="newCredits"
            rules={[{ required: true, message: '请输入新额度' }]}
          >
            <Input
              type="number"
              min={0}
              value={newCredits}
              onChange={(e) => setNewCredits(Number(e.target.value))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加用户"
        open={addUserModalVisible}
        onOk={() => addUserForm.submit()}
        onCancel={() => {
          setAddUserModalVisible(false);
          addUserForm.resetFields();
        }}
        confirmLoading={loading}
      >
        <Form
          form={addUserForm}
          onFinish={handleAddUser}
          layout="vertical"
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            label="手机号"
            name="phone"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }
            ]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item
            label="邮箱"
            name="email"
            rules={[{ type: 'email', message: '请输入有效的邮箱' }]}
          >
            <Input placeholder="请输入邮箱（可选）" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6位' }
            ]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default AdminPanel;