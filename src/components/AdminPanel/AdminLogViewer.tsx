import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  DatePicker,
  Select,
  message,
  Typography,
  Tooltip
} from 'antd';
import {
  ReloadOutlined,
  FileTextOutlined,
  UserAddOutlined,
  KeyOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { adminAPI } from '../../services/api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text } = Typography;

interface AdminLog {
  id: string;
  admin_id: string;
  admin_username: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: any;
  ip_address: string;
  created_at: string;
}

const actionLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  create_user: { label: '创建用户', color: 'green', icon: <UserAddOutlined /> },
  create_admin: { label: '创建管理员', color: 'blue', icon: <UserAddOutlined /> },
  generate_codes: { label: '生成激活码', color: 'purple', icon: <KeyOutlined /> },
  update_user: { label: '更新用户', color: 'orange', icon: <EditOutlined /> },
  delete_user: { label: '删除用户', color: 'red', icon: <DeleteOutlined /> },
  update_credits: { label: '调整额度', color: 'cyan', icon: <EditOutlined /> },
  reset_password: { label: '重置密码', color: 'gold', icon: <KeyOutlined /> },
};

const resourceLabels: Record<string, string> = {
  user: '用户',
  admin: '管理员',
  activation_code: '激活码',
  palette: '色库',
};

export const AdminLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [filters, setFilters] = useState({
    action: undefined as string | undefined,
    resource_type: undefined as string | undefined,
  });

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAdminLogs({
        page: pagination.current,
        limit: pagination.pageSize,
        action: filters.action,
        resource_type: filters.resource_type,
      });
      setLogs(response.data);
      setPagination(prev => ({
        ...prev,
        total: response.data.length === pagination.pageSize 
          ? (pagination.current * pagination.pageSize) + 1 
          : pagination.current * pagination.pageSize,
      }));
    } catch (error) {
      message.error('加载操作日志失败');
      console.error('Load logs error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [pagination.current, filters]);

  const handleTableChange = (newPagination: any) => {
    setPagination({
      ...pagination,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    });
  };

  const renderAction = (action: string) => {
    const config = actionLabels[action] || { 
      label: action, 
      color: 'default',
      icon: <FileTextOutlined />
    };
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.label}
      </Tag>
    );
  };

  const renderResourceType = (type: string) => {
    return resourceLabels[type] || type;
  };

  const renderDetails = (details: any) => {
    if (!details) return '-';
    
    const entries = Object.entries(details);
    if (entries.length === 0) return '-';
    
    return (
      <Tooltip 
        title={
          <div style={{ maxHeight: '200px', overflow: 'auto' }}>
            <pre style={{ margin: 0, fontSize: '12px' }}>
              {JSON.stringify(details, null, 2)}
            </pre>
          </div>
        }
        placement="left"
      >
        <Text type="secondary" style={{ cursor: 'pointer' }}>
          查看详情
        </Text>
      </Tooltip>
    );
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '管理员',
      dataIndex: 'admin_username',
      key: 'admin_username',
      width: 120,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 140,
      render: renderAction,
    },
    {
      title: '资源类型',
      dataIndex: 'resource_type',
      key: 'resource_type',
      width: 100,
      render: renderResourceType,
    },
    {
      title: '资源ID',
      dataIndex: 'resource_id',
      key: 'resource_id',
      width: 200,
      ellipsis: true,
    },
    {
      title: '详情',
      dataIndex: 'details',
      key: 'details',
      render: renderDetails,
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 140,
    },
  ];

  return (
    <Card
      title="管理员操作日志"
      extra={
        <Space>
          <Select
            placeholder="操作类型"
            allowClear
            style={{ width: 140 }}
            value={filters.action}
            onChange={(value) => setFilters({ ...filters, action: value })}
          >
            {Object.entries(actionLabels).map(([key, config]) => (
              <Option key={key} value={key}>
                {config.label}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="资源类型"
            allowClear
            style={{ width: 120 }}
            value={filters.resource_type}
            onChange={(value) => setFilters({ ...filters, resource_type: value })}
          >
            {Object.entries(resourceLabels).map(([key, label]) => (
              <Option key={key} value={key}>
                {label}
              </Option>
            ))}
          </Select>
          <Button onClick={loadLogs} icon={<ReloadOutlined />}>
            刷新
          </Button>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={logs}
        rowKey="id"
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
        size="small"
        scroll={{ x: 1000 }}
      />
    </Card>
  );
};
