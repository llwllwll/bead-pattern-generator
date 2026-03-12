import React, { useState, useEffect } from 'react';
import { Card, Layout, Menu, Tabs, Table, Button, Input, Form, Select, message, Modal, Popconfirm, Tag, Badge, DatePicker, Statistic, Row, Col, Progress } from 'antd';
import { UserOutlined, KeyOutlined, BarChartOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { adminAPI, authAPI } from '../../services/api';
import { useAuthStore } from '../../stores/useAuthStore';
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
  
  const { adminToken, adminLogin, adminLogout, isAdmin } = useAuthStore();

  // 监听 auth store 的登录状态变化
  useEffect(() => {
    const loggedIn = !!adminToken || isAdmin;
    setIsLoggedIn(loggedIn);
    
    // 如果登录了，加载数据
    if (loggedIn) {
      loadUsers();
      loadActivationCodes();
      loadStats();
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

  const handleGenerateCodes = async () => {
    try {
      setGeneratingCodes(true);
      const response = await adminAPI.generateActivationCodes({
        count: codeCount,
        code_type: codeType,
        credits: codeCredits,
        validity_days: codeValidity
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

  if (!isLoggedIn) {
    return (
      <div className={styles.loginContainer}>
        <Card title="管理员登录" className={styles.loginCard}>
          <Form
            onFinish={async (values) => {
              try {
                const success = await adminLogin(values.username, values.password);
                if (success) {
                  message.success('登录成功');
                } else {
                  message.error('登录失败，请检查用户名和密码');
                }
              } catch (error) {
                message.error('登录请求失败，请稍后重试');
                console.error('Login error:', error);
              }
            }}
          >
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input placeholder="请输入管理员用户名" />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input type="password" placeholder="请输入管理员密码" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block>
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
            onSelect={({ key }) => setActiveTab(key)}
            style={{ height: '100%', borderRight: 0 }}
          >
            <Menu.Item key="users" icon={<UserOutlined />}>
              用户管理
            </Menu.Item>
            <Menu.Item key="activation" icon={<KeyOutlined />}>
              激活码管理
            </Menu.Item>
            <Menu.Item key="stats" icon={<BarChartOutlined />}>
              统计信息
            </Menu.Item>
          </Menu>
        </Sider>
        <Content className={styles.content}>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="用户管理" key="users">
              <Card
                title="用户列表"
                extra={
                  <Button onClick={loadUsers} icon={<ReloadOutlined />}>
                    刷新
                  </Button>
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
            </TabPane>
            <TabPane tab="激活码管理" key="activation">
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
            </TabPane>
            <TabPane tab="统计信息" key="stats">
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
            </TabPane>
          </Tabs>
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
    </Layout>
  );
};

export default AdminPanel;