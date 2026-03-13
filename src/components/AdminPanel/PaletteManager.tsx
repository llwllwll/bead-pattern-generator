import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Input, Form, Select, message, Modal, Popconfirm,
  Tag, Space, ColorPicker, InputNumber, Switch, Row, Col, Divider
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  EyeOutlined, PlusCircleOutlined, MinusCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { paletteApi } from '../../services/api';

const { Option } = Select;
const { TextArea } = Input;

interface PaletteColor {
  id: string;
  color_code: string;
  name: string;
  hex: string;
  is_transparent: boolean;
  is_glow: boolean;
  is_metallic: boolean;
  display_order: number;
}

interface Palette {
  id: string;
  name: string;
  code: string;
  description: string;
  brand: string;
  is_active: boolean;
  is_default: boolean;
  colors: PaletteColor[];
  color_count: number;
  created_at: string;
}

interface PaletteFormData {
  name: string;
  code: string;
  description: string;
  brand: string;
  is_default: boolean;
  colors: Array<{
    color_code: string;
    name: string;
    hex: string;
    is_transparent: boolean;
    is_glow: boolean;
    is_metallic: boolean;
  }>;
}

export const PaletteManager: React.FC = () => {
  const [palettes, setPalettes] = useState<Palette[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPalette, setEditingPalette] = useState<Palette | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedPalette, setSelectedPalette] = useState<Palette | null>(null);
  const [form] = Form.useForm();
  const [colorForm] = Form.useForm();

  useEffect(() => {
    loadPalettes();
  }, []);

  const loadPalettes = async () => {
    try {
      setLoading(true);
      const data = await paletteApi.getPalettes();
      setPalettes(data);
    } catch (error) {
      message.error('加载色库失败');
      console.error('Load palettes error:', error);
      setPalettes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: PaletteFormData) => {
    try {
      setLoading(true);
      await paletteApi.createPalette({
        ...values,
        colors: values.colors.map((c, idx) => ({
          ...c,
          display_order: idx,
        })),
      });
      message.success('色库创建成功');
      setModalVisible(false);
      form.resetFields();
      loadPalettes();
    } catch (error: any) {
      message.error(error.response?.data?.detail || '创建色库失败');
      console.error('Create palette error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (values: Partial<Palette>) => {
    if (!editingPalette) return;

    try {
      setLoading(true);
      await paletteApi.updatePalette(editingPalette.id, values);
      message.success('色库更新成功');
      setModalVisible(false);
      setEditingPalette(null);
      form.resetFields();
      loadPalettes();
    } catch (error: any) {
      message.error(error.response?.data?.detail || '更新色库失败');
      console.error('Update palette error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (paletteId: string) => {
    try {
      setLoading(true);
      await paletteApi.deletePalette(paletteId);
      message.success('色库删除成功');
      loadPalettes();
    } catch (error) {
      message.error('删除色库失败');
      console.error('Delete palette error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingPalette(null);
    form.resetFields();
    form.setFieldsValue({
      colors: [{ color_code: '', name: '', hex: '#000000', is_transparent: false, is_glow: false, is_metallic: false }],
    });
    setModalVisible(true);
  };

  const openEditModal = (palette: Palette) => {
    setEditingPalette(palette);
    form.setFieldsValue({
      name: palette.name,
      description: palette.description,
      brand: palette.brand,
      is_active: palette.is_active,
      is_default: palette.is_default,
    });
    setModalVisible(true);
  };

  const openDetailModal = async (palette: Palette) => {
    try {
      setLoading(true);
      const detail = await paletteApi.getPalette(palette.id);
      setSelectedPalette(detail);
      setDetailModalVisible(true);
    } catch (error) {
      message.error('加载色库详情失败');
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<Palette> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <span>{text}</span>
          {record.is_default && <Tag color="blue">默认</Tag>}
          {!record.is_active && <Tag color="red">已禁用</Tag>}
        </Space>
      ),
    },
    {
      title: '编码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      key: 'brand',
      render: (text) => text || '-',
    },
    {
      title: '颜色数量',
      dataIndex: 'color_count',
      key: 'color_count',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => openDetailModal(record)}
            title="查看详情"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
            title="编辑"
          />
          <Popconfirm
            title="确定删除此色库吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              title="删除"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="色库管理"
      extra={
        <Space>
          <Button onClick={loadPalettes} icon={<ReloadOutlined />}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            添加色库
          </Button>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={palettes}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />

      {/* 创建/编辑色库模态框 */}
      <Modal
        title={editingPalette ? '编辑色库' : '创建色库'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingPalette(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={800}
        confirmLoading={loading}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editingPalette ? handleUpdate : handleCreate}
        >
          {!editingPalette && (
            <>
              <Form.Item
                name="name"
                label="色库名称"
                rules={[{ required: true, message: '请输入色库名称' }]}
              >
                <Input placeholder="如：Perler 标准色板" />
              </Form.Item>
              <Form.Item
                name="code"
                label="色库编码"
                rules={[
                  { required: true, message: '请输入色库编码' },
                  { pattern: /^[a-z0-9_-]+$/, message: '只能使用小写字母、数字、下划线和横线' },
                ]}
              >
                <Input placeholder="如：perler-standard" />
              </Form.Item>
            </>
          )}

          {editingPalette && (
            <>
              <Form.Item
                name="name"
                label="色库名称"
                rules={[{ required: true, message: '请输入色库名称' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item name="description" label="描述">
                <TextArea rows={2} />
              </Form.Item>
              <Form.Item name="brand" label="品牌">
                <Input placeholder="如：Perler, Hama, Artkal" />
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="is_active" valuePropName="checked">
                    <Switch checkedChildren="启用" unCheckedChildren="禁用" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="is_default" valuePropName="checked">
                    <Switch checkedChildren="默认" unCheckedChildren="非默认" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {!editingPalette && (
            <>
              <Form.Item name="description" label="描述">
                <TextArea rows={2} />
              </Form.Item>
              <Form.Item name="brand" label="品牌">
                <Input placeholder="如：Perler, Hama, Artkal" />
              </Form.Item>
              <Form.Item name="is_default" valuePropName="checked" initialValue={false}>
                <Switch checkedChildren="设为默认" unCheckedChildren="非默认" />
              </Form.Item>

              <Divider>颜色列表</Divider>

              <Form.List name="colors">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Row key={key} gutter={8} align="middle" style={{ marginBottom: 8 }}>
                        <Col span={4}>
                          <Form.Item
                            {...restField}
                            name={[name, 'color_code']}
                            rules={[{ required: true, message: '编号' }]}
                            noStyle
                          >
                            <Input placeholder="如 A1" />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item
                            {...restField}
                            name={[name, 'name']}
                            noStyle
                          >
                            <Input placeholder="颜色名称" />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item
                            {...restField}
                            name={[name, 'hex']}
                            rules={[{ required: true, message: '颜色' }]}
                            noStyle
                          >
                            <Input type="color" style={{ width: '100%', height: 32, padding: 0 }} />
                          </Form.Item>
                        </Col>
                        <Col span={3}>
                          <Form.Item
                            {...restField}
                            name={[name, 'is_transparent']}
                            valuePropName="checked"
                            noStyle
                          >
                            <Switch size="small" checkedChildren="透" unCheckedChildren="透" />
                          </Form.Item>
                        </Col>
                        <Col span={3}>
                          <Form.Item
                            {...restField}
                            name={[name, 'is_glow']}
                            valuePropName="checked"
                            noStyle
                          >
                            <Switch size="small" checkedChildren="夜" unCheckedChildren="夜" />
                          </Form.Item>
                        </Col>
                        <Col span={3}>
                          <Form.Item
                            {...restField}
                            name={[name, 'is_metallic']}
                            valuePropName="checked"
                            noStyle
                          >
                            <Switch size="small" checkedChildren="金" unCheckedChildren="金" />
                          </Form.Item>
                        </Col>
                        <Col span={1}>
                          <MinusCircleOutlined onClick={() => remove(name)} />
                        </Col>
                      </Row>
                    ))}
                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<PlusOutlined />}
                    >
                      添加颜色
                    </Button>
                  </>
                )}
              </Form.List>
            </>
          )}
        </Form>
      </Modal>

      {/* 色库详情模态框 */}
      <Modal
        title={selectedPalette?.name}
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedPalette(null);
        }}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={900}
      >
        {selectedPalette && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <strong>编码：</strong>{selectedPalette.code}
              </Col>
              <Col span={8}>
                <strong>品牌：</strong>{selectedPalette.brand || '-'}
              </Col>
              <Col span={8}>
                <strong>状态：</strong>
                {selectedPalette.is_active ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>}
                {selectedPalette.is_default && <Tag color="blue">默认</Tag>}
              </Col>
            </Row>
            {selectedPalette.description && (
              <p><strong>描述：</strong>{selectedPalette.description}</p>
            )}
            <Divider />
            <h4>颜色列表（共 {selectedPalette.colors?.length || 0} 种）</h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 12,
                maxHeight: 400,
                overflow: 'auto',
                padding: 8,
              }}
            >
              {selectedPalette.colors?.map((color) => (
                <div
                  key={color.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: 8,
                    border: '1px solid #f0f0f0',
                    borderRadius: 4,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      backgroundColor: color.hex,
                      border: '1px solid rgba(0,0,0,0.1)',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500 }}>{color.color_code}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {color.name || '-'} {color.hex}
                    </div>
                    <div style={{ fontSize: 11 }}>
                      {color.is_transparent && <Tag size="small">透明</Tag>}
                      {color.is_glow && <Tag size="small" color="purple">夜光</Tag>}
                      {color.is_metallic && <Tag size="small" color="gold">金属</Tag>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
};
