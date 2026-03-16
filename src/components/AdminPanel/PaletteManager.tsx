import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Input, Form, Select, message, Modal, Popconfirm,
  Tag, Space, Switch, Row, Col, Divider, Upload, Alert, Progress
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  EyeOutlined, MinusCircleOutlined, DownloadOutlined, UploadOutlined
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

type ParsedColorRow = {
  rowNumber: number;
  color_code: string;
  name?: string;
  hex: string;
  is_transparent?: boolean;
  is_glow?: boolean;
  is_metallic?: boolean;
  display_order?: number;
  error?: string;
};

export const PaletteManager: React.FC = () => {
  const [palettes, setPalettes] = useState<Palette[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPalette, setEditingPalette] = useState<Palette | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedPalette, setSelectedPalette] = useState<Palette | null>(null);
  const [form] = Form.useForm();
  const [colorForm] = Form.useForm();
  const [csvRows, setCsvRows] = useState<ParsedColorRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [importSummary, setImportSummary] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

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
      setCsvRows([]);
      setImportSummary(null);
      setImportProgress({ done: 0, total: 0 });
    } catch (error) {
      message.error('加载色库详情失败');
    } finally {
      setLoading(false);
    }
  };

  const downloadCsvTemplate = () => {
    const template = [
      'color_code,name,hex,is_transparent,is_glow,is_metallic,display_order',
      'A1,Red,#FF0000,false,false,false,0',
      'A2,Green,#00FF00,false,false,false,1',
      'A3,Transparent,#FFFFFF,true,false,false,2',
      'A4,Night Glow,#0000FF,false,true,false,3',
      'A5,Metallic Gold,#FFD700,false,false,true,4',
      '',
      '说明：',
      '- color_code: 颜色编号（必填）',
      '- name: 颜色名称（可选）',
      '- hex: 颜色值，格式为 #RRGGBB（必填）',
      '- is_transparent: 是否透明，值为 true/false（可选，默认false）',
      '- is_glow: 是否夜光，值为 true/false（可选，默认false）',
      '- is_metallic: 是否金属色，值为 true/false（可选，默认false）',
      '- display_order: 显示顺序（可选，数字越小越靠前）',
      '',
      '注意事项：',
      '- 第一行为表头，可以省略',
      '- 布尔值可以使用：true/false, 1/0, yes/no, 是/否',
      '- HEX颜色值必须以 # 开头，如 #FF0000',
      '- 如果 display_order 为空，将自动按顺序添加',
    ].join('\n');
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'palette_colors_template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const parseBool = (raw: string | undefined): boolean | undefined => {
    if (raw == null) return undefined;
    const v = raw.trim().toLowerCase();
    if (v === '') return undefined;
    if (['1', 'true', 'yes', 'y', '是', '对'].includes(v)) return true;
    if (['0', 'false', 'no', 'n', '否', '错'].includes(v)) return false;
    return undefined;
  };

  const normalizeHex = (raw: string): string | null => {
    const v = raw.trim();
    const hex = v.startsWith('#') ? v : `#${v}`;
    return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toUpperCase() : null;
  };

  const parseCsv = async (file: File) => {
    const text = await file.text();
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim() !== '');
    if (lines.length === 0) {
      setCsvRows([{ rowNumber: 1, color_code: '', hex: '', error: 'CSV为空' }]);
      return;
    }

    const splitLine = (line: string) => {
      // Minimal CSV splitter supporting quotes; good enough for our template.
      const out: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          const next = line[i + 1];
          if (inQuotes && next === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          out.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
      out.push(cur);
      return out.map((s) => s.trim());
    };

    const headerCells = splitLine(lines[0]).map((h) => h.toLowerCase());
    const hasHeader = headerCells.includes('color_code') && headerCells.includes('hex');
    const startIndex = hasHeader ? 1 : 0;

    const idx = (name: string) => headerCells.indexOf(name);
    const colorCodeIdx = hasHeader ? idx('color_code') : 0;
    const nameIdx = hasHeader ? idx('name') : 1;
    const hexIdx = hasHeader ? idx('hex') : 2;
    const transparentIdx = hasHeader ? idx('is_transparent') : 3;
    const glowIdx = hasHeader ? idx('is_glow') : 4;
    const metallicIdx = hasHeader ? idx('is_metallic') : 5;
    const orderIdx = hasHeader ? idx('display_order') : 6;

    const rows: ParsedColorRow[] = [];
    for (let i = startIndex; i < lines.length; i++) {
      const cells = splitLine(lines[i]);
      const rowNumber = i + 1;
      const color_code = (cells[colorCodeIdx] ?? '').trim();
      const hexRaw = (cells[hexIdx] ?? '').trim();

      const hex = hexRaw ? normalizeHex(hexRaw) : null;
      const display_order_raw = orderIdx >= 0 ? (cells[orderIdx] ?? '').trim() : '';
      const display_order = display_order_raw !== '' && !Number.isNaN(Number(display_order_raw)) ? Number(display_order_raw) : undefined;

      let error: string | undefined;
      if (!color_code) error = '缺少 color_code';
      else if (!hex) error = 'hex 格式错误（需 #RRGGBB）';

      rows.push({
        rowNumber,
        color_code,
        name: nameIdx >= 0 ? (cells[nameIdx] ?? '').trim() || undefined : undefined,
        hex: hex ?? '',
        is_transparent: transparentIdx >= 0 ? parseBool(cells[transparentIdx]) : undefined,
        is_glow: glowIdx >= 0 ? parseBool(cells[glowIdx]) : undefined,
        is_metallic: metallicIdx >= 0 ? parseBool(cells[metallicIdx]) : undefined,
        display_order,
        error,
      });
    }

    setCsvRows(rows);
    setImportSummary(null);
  };

  const handleImportCsv = async () => {
    if (!selectedPalette) return;
    const validRows = csvRows.filter((r) => !r.error);
    if (validRows.length === 0) {
      message.warning('没有可导入的有效行');
      return;
    }

    setImporting(true);
    setImportSummary(null);
    setImportProgress({ done: 0, total: validRows.length });

    // Default display_order: append after existing max.
    const existingMax = Math.max(-1, ...(selectedPalette.colors ?? []).map((c) => c.display_order ?? 0));
    let autoOrder = existingMax + 1;

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        await paletteApi.addColor(selectedPalette.id, {
          color_code: row.color_code,
          name: row.name,
          hex: row.hex,
          is_transparent: row.is_transparent ?? false,
          is_glow: row.is_glow ?? false,
          is_metallic: row.is_metallic ?? false,
          display_order: row.display_order ?? autoOrder++,
        });
        success++;
      } catch (e: any) {
        failed++;
        const detail = e?.response?.data?.detail || e?.message || '未知错误';
        errors.push(`第${row.rowNumber}行(${row.color_code}): ${detail}`);
      } finally {
        setImportProgress({ done: i + 1, total: validRows.length });
      }
    }

    setImportSummary({ success, failed, errors: errors.slice(0, 20) });
    setImporting(false);

    if (failed === 0) message.success(`导入成功：${success} 条`);
    else message.warning(`导入完成：成功 ${success}，失败 ${failed}`);

    // Reload palette detail
    try {
      const detail = await paletteApi.getPalette(selectedPalette.id);
      setSelectedPalette(detail);
    } catch {
      // ignore
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
          setCsvRows([]);
          setImportSummary(null);
          setImportProgress({ done: 0, total: 0 });
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
            <Alert
              message="批量导入颜色（CSV）"
              description="通过CSV文件批量导入颜色，支持一次性添加多个颜色到色库中"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Space style={{ marginBottom: 12 }} wrap>
              <Button icon={<DownloadOutlined />} onClick={downloadCsvTemplate}>
                下载CSV模板
              </Button>
              <Upload
                accept=".csv,text/csv"
                maxCount={1}
                showUploadList={false}
                beforeUpload={(file) => {
                  parseCsv(file);
                  return false;
                }}
              >
                <Button icon={<UploadOutlined />}>上传CSV并解析</Button>
              </Upload>
              <Button
                type="primary"
                disabled={importing || csvRows.filter((r) => !r.error).length === 0}
                loading={importing}
                onClick={handleImportCsv}
              >
                开始导入 ({csvRows.filter((r) => !r.error).length}条有效数据)
              </Button>
              {csvRows.length > 0 && (
                <Button danger onClick={() => setCsvRows([])}>
                  清除解析结果
                </Button>
              )}
            </Space>

            {importing && (
              <div style={{ marginBottom: 12 }}>
                <Progress
                  percent={importProgress.total ? Math.round((importProgress.done / importProgress.total) * 100) : 0}
                  status="active"
                />
              </div>
            )}

            {importSummary && (
              <Alert
                type={importSummary.failed === 0 ? 'success' : 'warning'}
                showIcon
                message={`导入结果：成功 ${importSummary.success}，失败 ${importSummary.failed}`}
                description={
                  importSummary.errors.length > 0 ? (
                    <div style={{ maxHeight: 120, overflow: 'auto' }}>
                      {importSummary.errors.map((e, idx) => (
                        <div key={idx}>{e}</div>
                      ))}
                      {importSummary.failed > importSummary.errors.length && <div>…更多错误已省略</div>}
                    </div>
                  ) : undefined
                }
                style={{ marginBottom: 12 }}
              />
            )}

            {csvRows.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>
                  CSV解析结果（共 {csvRows.length} 行，{csvRows.filter((r) => !r.error).length} 行有效，{csvRows.filter((r) => r.error).length} 行错误）
                </div>
                <Table
                  size="small"
                  rowKey={(r) => `${r.rowNumber}-${r.color_code}`}
                  dataSource={csvRows}
                  pagination={{ pageSize: 8 }}
                  scroll={{ x: 800 }}
                  columns={[
                    { title: '行号', dataIndex: 'rowNumber', width: 60, fixed: 'left' },
                    { title: '颜色编号', dataIndex: 'color_code', width: 100 },
                    { title: '颜色名称', dataIndex: 'name', width: 120, render: (v) => v || '-' },
                    { 
                      title: '颜色', 
                      dataIndex: 'hex', 
                      width: 100,
                      render: (hex) => (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div 
                            style={{ 
                              width: 20, 
                              height: 20, 
                              borderRadius: 4, 
                              backgroundColor: hex,
                              border: '1px solid #d9d9d9'
                            }} 
                          />
                          <span>{hex}</span>
                        </div>
                      )
                    },
                    { title: '透明', dataIndex: 'is_transparent', width: 70, render: (v) => (v ? '是' : '否') },
                    { title: '夜光', dataIndex: 'is_glow', width: 70, render: (v) => (v ? '是' : '否') },
                    { title: '金属', dataIndex: 'is_metallic', width: 70, render: (v) => (v ? '是' : '否') },
                    { title: '排序', dataIndex: 'display_order', width: 80, render: (v) => (v ?? '-') },
                    {
                      title: '状态',
                      dataIndex: 'error',
                      width: 120,
                      fixed: 'right',
                      render: (v) => v ? <Tag color="red" style={{ fontSize: 11 }}>{v}</Tag> : <Tag color="green">有效</Tag>,
                    },
                  ]}
                  rowClassName={(record) => record.error ? 'error-row' : ''}
                />
              </div>
            )}

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
