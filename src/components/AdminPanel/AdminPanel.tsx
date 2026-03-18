import React, { useState, useEffect } from 'react';
import { Card, Layout, Menu, Tabs, Table, Button, Input, Form, Select, message, Modal, Popconfirm, Tag, Badge, DatePicker, Statistic, Row, Col, Progress, Spin, Typography, Alert, Switch } from 'antd';
import { UserOutlined, KeyOutlined, BarChartOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, EyeOutlined, ArrowLeftOutlined, BgColorsOutlined, TeamOutlined, FileTextOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { adminAPI, authAPI } from '../../services/api';
import { useAuthStore } from '../../stores/useAuthStore';
import { PaletteManager } from './PaletteManager';
import { AdminLogViewer } from './AdminLogViewer';
import styles from './AdminPanel.module.css';

const { Header, Content, Sider } = Layout;
const { TabPane } = Tabs;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text } = Typography;

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
  users: {
    total: number;
    active: number;
  };
  activation_codes: {
    total: number;
    used: number;
    available: number;
  };
  usage: {
    today: number;
  };
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
  const [editUserModalVisible, setEditUserModalVisible] = useState(false);
  const [addAdminModalVisible, setAddAdminModalVisible] = useState(false);
  const [addUserForm] = Form.useForm();
  const [editUserForm] = Form.useForm();
  const [addAdminForm] = Form.useForm();
  const [admins, setAdmins] = useState<any[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { adminToken, adminLogin, adminLogout, isAdmin } = useAuthStore();

  // 监听 auth store 的登录状态变化
  useEffect(() => {
    const initializeAdminPanel = async () => {
      try {
        setError(null);
        // 检查 localStorage 中的 token，确保状态一致性
        const storedToken = localStorage.getItem('admin_access_token');
        const loggedIn = !!(storedToken || adminToken || isAdmin);
        setIsLoggedIn(loggedIn);
        
        // 如果登录了，加载数据
        if (loggedIn) {
          await loadUsers();
          await loadActivationCodes();
          await loadStats();
        }
      } catch (error) {
        console.error('Admin panel initialization error:', error);
        setError('初始化管理后台失败，请刷新页面重试');
      } finally {
        // 初始化完成
        setIsInitializing(false);
      }
    };
    
    initializeAdminPanel();
  }, [adminToken, isAdmin]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.listUsers();
      const data = response.data as any;
      const items = Array.isArray(data) ? data : (data?.items ?? []);
      setUsers(items);
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
    } catch (error: any) {
      console.error('Load activation codes error:', error);
      // 检查是否是401未授权错误
      if (error.response?.status === 401) {
        // 清除过期的管理员token
        localStorage.removeItem('admin_access_token');
        localStorage.removeItem('admin_refresh_token');
        // 重置管理员状态
      } else if (error.response?.status === 500) {
        setError('服务器内部错误，请稍后重试');
      } else if (error.response?.status === 404) {
        setError('请求的资源不存在');
      } else {
        setError(`加载激活码失败: ${error.response?.data?.detail || error.message || '未知错误'}`);
      }
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

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.listAdmins();
      const data = response.data as any;
      const items = Array.isArray(data) ? data : (data?.items ?? []);
      setAdmins(items);
    } catch (error) {
      console.error('Load admins error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (values: any) => {
    try {
      setLoading(true);
      await adminAPI.createAdmin(values);
      message.success('管理员创建成功');
      setAddAdminModalVisible(false);
      addAdminForm.resetFields();
      loadAdmins();
    } catch (error) {
      message.error('创建管理员失败');
      console.error('Add admin error:', error);
    } finally {
      setLoading(false);
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
      await adminAPI.updateUserCredits(editingUser.id, {
        action: 'set',
        amount: newCredits
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
      loadUsers();
    } catch (error) {
      message.error('密码重置失败');
      console.error('Reset password error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    editUserForm.setFieldsValue({
      username: user.username,
      email: user.email,
      phone: user.phone,
      is_active: user.is_active,
      is_verified: user.is_verified
    });
    setEditUserModalVisible(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    try {
      setLoading(true);
      const values = await editUserForm.validateFields();
      await adminAPI.updateUser(editingUser.id, values);
      message.success('用户资料更新成功');
      setEditUserModalVisible(false);
      setEditingUser(null);
      editUserForm.resetFields();
      loadUsers();
    } catch (error) {
      message.error('更新用户资料失败');
      console.error('Update user error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      setLoading(true);
      // 找到用户，获取当前状态
      const user = users.find(u => u.id === userId);
      if (!user) return;
      
      // 调用 updateUser 方法更新用户状态
      await adminAPI.updateUser(userId, {
        is_active: !user.is_active
      });
      message.success(user.is_active ? '用户已禁用' : '用户已启用');
      loadUsers();
    } catch (error) {
      message.error('操作失败');
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
            onClick={() => handleEditUser(record)}
          >
            编辑资料
          </Button>
          <Button 
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
            title={record.is_active ? "确定要禁用该用户吗？" : "确定要启用该用户吗？"}
            onConfirm={() => handleDeactivateUser(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              danger={record.is_active} 
              type={!record.is_active ? "primary" : "default"}
              size="small"
            >
              {record.is_active ? '禁用' : '启用'}
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const adminColumns = [
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
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>
          {role === 'admin' ? '超级管理员' : '普通管理员'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: string | Date) => new Date(time).toLocaleString(),
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

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <Alert
          message="管理后台错误"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => window.location.reload()}>
              刷新页面
            </Button>
          }
        />
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
                  // 登录成功后立即更新状态
                  setIsLoggedIn(true);
                  // 等待一小段时间确保token已保存到localStorage
                  await new Promise(resolve => setTimeout(resolve, 200));
                  // 重新加载数据
                  try {
                    await loadUsers();
                    await loadActivationCodes();
                    await loadStats();
                  } catch (error) {
                    console.error('Load data error:', error);
                    // 如果加载数据失败，可能是token问题，重新登录
                    localStorage.removeItem('admin_access_token');
                    localStorage.removeItem('admin_refresh_token');
                    adminLogout();
                    setError('登录已过期，请重新登录');
                    setTimeout(() => {
                      window.location.href = '/admin';
                    }, 2000);
                  }
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
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Button 
            type="default" 
            icon={<ArrowLeftOutlined />} 
            onClick={() => window.location.href = '/'} 
            style={{ marginRight: 16 }}
          >
            返回主页
          </Button>
          <div className={styles.headerTitle}>拼豆图纸生成器 - 管理后台</div>
          <div style={{ marginLeft: 'auto' }}>
            <Button onClick={adminLogout} className={styles.logoutButton}>
              退出登录
            </Button>
          </div>
        </div>
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
                key: 'admins',
                icon: <TeamOutlined />,
                label: '管理员管理',
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
              {
                key: 'logs',
                icon: <FileTextOutlined />,
                label: '操作日志',
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
                key: 'admins',
                label: '管理员管理',
                children: (
                  <Card
                    title="管理员列表"
                    extra={
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddAdminModalVisible(true)}>
                          添加管理员
                        </Button>
                        <Button onClick={loadAdmins} icon={<ReloadOutlined />}>
                          刷新
                        </Button>
                      </div>
                    }
                  >
                    <Table
                      columns={adminColumns}
                      dataSource={admins}
                      rowKey="id"
                      loading={loading}
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
                            <Statistic title="总用户数" value={stats.users?.total ?? 0} />
                          </Col>
                          <Col span={6}>
                            <Statistic title="活跃用户" value={stats.users?.active ?? 0} />
                          </Col>
                          <Col span={6}>
                            <Statistic title="总激活码" value={stats.activation_codes?.total ?? 0} />
                          </Col>
                          <Col span={6}>
                            <Statistic title="已使用激活码" value={stats.activation_codes?.used ?? 0} />
                          </Col>
                        </Row>
                        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                          <Col span={12}>
                            <Card>
                              <Statistic title="今日使用次数" value={stats.usage?.today ?? 0} />
                            </Card>
                          </Col>
                          <Col span={12}>
                            <Card>
                              <Statistic title="可用激活码" value={stats.activation_codes?.available ?? 0} />
                            </Card>
                          </Col>
                        </Row>
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
                key: 'logs',
                label: '操作日志',
                children: <AdminLogViewer />,
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
          >
            <Input value={editingUser?.username || ''} disabled />
          </Form.Item>
          <Form.Item
            label="当前额度"
          >
            <Input value={editingUser?.remaining_credits || 0} disabled />
          </Form.Item>
          <Form.Item
            label="新额度"
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

      {/* 编辑用户资料模态框 */}
      <Modal
        title="编辑用户资料"
        open={editUserModalVisible}
        onCancel={() => {
          setEditUserModalVisible(false);
          setEditingUser(null);
          editUserForm.resetFields();
        }}
        onOk={handleUpdateUser}
        confirmLoading={loading}
      >
        <Form form={editUserForm} layout="vertical">
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="手机号"
            rules={[{ pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item
            name="is_active"
            label="状态"
          >
            <Switch checkedChildren="活跃" unCheckedChildren="禁用" />
          </Form.Item>
          <Form.Item
            name="is_verified"
            label="是否已验证"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加管理员模态框 */}
      <Modal
        title="添加管理员"
        open={addAdminModalVisible}
        onCancel={() => {
          setAddAdminModalVisible(false);
          addAdminForm.resetFields();
        }}
        onOk={() => addAdminForm.submit()}
        confirmLoading={loading}
      >
        <Form
          form={addAdminForm}
          onFinish={handleAddAdmin}
          layout="vertical"
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入管理员用户名" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[{ required: true, type: 'email', message: '请输入有效的邮箱地址' }]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6位' }
            ]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Option value="admin">超级管理员</Option>
              <Option value="staff">普通管理员</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default AdminPanel;