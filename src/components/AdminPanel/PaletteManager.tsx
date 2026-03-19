import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Input, Form, Select, message, Modal, Popconfirm,
  Tag, Space, Switch, Row, Col, Divider, Upload, Alert, Progress, Tabs
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  EyeOutlined, DownloadOutlined, UploadOutlined, ImportOutlined,
  HolderOutlined, ExportOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import { paletteApi, type Brand, type Series, type Color, type ColorImportRow } from '../../services/api';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

// ============== Types ==============

interface BrandFormData {
  name: string;
  code: string;
  description?: string;
  logo_url?: string;
  is_active: boolean;
  display_order: number;
}

interface SeriesFormData {
  name: string;
  code: string;
  description?: string;
  brand_id: string;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
}

interface ColorFormData {
  color_code: string;
  name?: string;
  hex: string;
  is_transparent: boolean;
  is_glow: boolean;
  is_metallic: boolean;
  display_order: number;
}

// ============== Component ==============

export const PaletteManager: React.FC = () => {
  // ========== State ==========
  const [activeTab, setActiveTab] = useState('brands');
  
  // Brands
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandModalVisible, setBrandModalVisible] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandForm] = Form.useForm();
  const [selectedBrandKeys, setSelectedBrandKeys] = useState<React.Key[]>([]);
  const [draggedBrandIndex, setDraggedBrandIndex] = useState<number | null>(null);
  
  // Series
  const [series, setSeries] = useState<Series[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesModalVisible, setSeriesModalVisible] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [seriesForm] = Form.useForm();
  const [selectedBrandForSeries, setSelectedBrandForSeries] = useState<string>('');
  const [selectedSeriesKeys, setSelectedSeriesKeys] = useState<React.Key[]>([]);
  const [draggedSeriesIndex, setDraggedSeriesIndex] = useState<number | null>(null);
  
  // Colors
  const [colors, setColors] = useState<Color[]>([]);
  const [colorsLoading, setColorsLoading] = useState(false);
  const [colorModalVisible, setColorModalVisible] = useState(false);
  const [editingColor, setEditingColor] = useState<Color | null>(null);
  const [colorForm] = Form.useForm();
  const [selectedSeriesForColor, setSelectedSeriesForColor] = useState<string>('');
  
  // Import
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importData, setImportData] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{success: number; failed: number; errors: string[]} | null>(null);
  const [parsedData, setParsedData] = useState<ColorImportRow[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [fileName, setFileName] = useState('');

  // ========== Effects ==========
  useEffect(() => {
    loadBrands();
    loadSeries();
    loadColors();
  }, []);

  // ========== Brand Functions ==========
  const loadBrands = async () => {
    try {
      setBrandLoading(true);
      const data = await paletteApi.getBrands();
      setBrands(data);
    } catch (error) {
      message.error('加载品牌失败');
      console.error('Load brands error:', error);
    } finally {
      setBrandLoading(false);
    }
  };

  const handleCreateBrand = async (values: BrandFormData) => {
    try {
      await paletteApi.createBrand(values);
      message.success('品牌创建成功');
      setBrandModalVisible(false);
      brandForm.resetFields();
      loadBrands();
    } catch (error: any) {
      message.error(error.response?.data?.detail || '创建品牌失败');
    }
  };

  const handleUpdateBrand = async (values: BrandFormData) => {
    if (!editingBrand) return;
    try {
      await paletteApi.updateBrand(editingBrand.id, values);
      message.success('品牌更新成功');
      setBrandModalVisible(false);
      setEditingBrand(null);
      brandForm.resetFields();
      loadBrands();
    } catch (error: any) {
      message.error(error.response?.data?.detail || '更新品牌失败');
    }
  };

  const handleDeleteBrand = async (brandId: string) => {
    try {
      await paletteApi.deleteBrand(brandId);
      message.success('品牌删除成功');
      loadBrands();
      loadSeries();
    } catch (error: any) {
      message.error(error.response?.data?.detail || '删除品牌失败');
    }
  };

  const handleBrandDragStart = (index: number) => {
    setDraggedBrandIndex(index);
  };

  const handleBrandDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedBrandIndex === null || draggedBrandIndex === index) return;
    
    const newBrands = [...brands];
    const draggedItem = newBrands[draggedBrandIndex];
    newBrands.splice(draggedBrandIndex, 1);
    newBrands.splice(index, 0, draggedItem);
    setBrands(newBrands);
    setDraggedBrandIndex(index);
  };

  const handleBrandDragEnd = async () => {
    if (draggedBrandIndex === null) return;
    
    try {
      const orders = brands.map((brand, index) => ({
        id: brand.id,
        display_order: index
      }));
      await paletteApi.batchReorderBrands(orders);
      message.success('排序更新成功');
    } catch (error) {
      message.error('排序更新失败');
      loadBrands();
    } finally {
      setDraggedBrandIndex(null);
    }
  };

  const handleBatchDeleteBrands = async () => {
    if (selectedBrandKeys.length === 0) {
      message.warning('请先选择要删除的品牌');
      return;
    }
    
    try {
      const result = await paletteApi.batchDeleteBrands(selectedBrandKeys as string[]);
      message.success(result.message);
      setSelectedBrandKeys([]);
      loadBrands();
      loadSeries();
    } catch (error: any) {
      message.error(error.response?.data?.detail || '批量删除失败');
    }
  };

  const handleExportBrands = async () => {
    try {
      const brandIds = selectedBrandKeys.length > 0 ? selectedBrandKeys as string[] : undefined;
      const data = await paletteApi.exportBrands(brandIds);
      
      const headers = ['brand_code', 'brand_name', 'series_code', 'series_name', 'color_code', 'color_name', 'hex', 'is_transparent', 'is_glow', 'is_metallic'];
      const csvContent = [
        headers.join(','),
        ...data.map((row: any) => headers.map(h => row[h]).join(','))
      ].join('\n');
      
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `brands_export_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
      message.success(`成功导出 ${data.length} 条数据`);
    } catch (error: any) {
      message.error(error.response?.data?.detail || '导出失败');
    }
  };

  const openBrandModal = (brand?: Brand) => {
    if (brand) {
      setEditingBrand(brand);
      brandForm.setFieldsValue({
        name: brand.name,
        code: brand.code,
        description: brand.description,
        logo_url: brand.logo_url,
        is_active: brand.is_active,
        display_order: brand.display_order
      });
    } else {
      setEditingBrand(null);
      brandForm.resetFields();
    }
    setBrandModalVisible(true);
  };

  // ========== Series Functions ==========
  const loadSeries = async (brandId?: string) => {
    try {
      setSeriesLoading(true);
      const data = await paletteApi.getSeries(brandId);
      setSeries(data);
    } catch (error) {
      message.error('加载系列失败');
      console.error('Load series error:', error);
    } finally {
      setSeriesLoading(false);
    }
  };

  const handleCreateSeries = async (values: SeriesFormData) => {
    try {
      await paletteApi.createSeries(values);
      message.success('系列创建成功');
      setSeriesModalVisible(false);
      seriesForm.resetFields();
      loadSeries();
    } catch (error: any) {
      message.error(error.response?.data?.detail || '创建系列失败');
    }
  };

  const handleUpdateSeries = async (values: SeriesFormData) => {
    if (!editingSeries) return;
    try {
      await paletteApi.updateSeries(editingSeries.id, values);
      message.success('系列更新成功');
      setSeriesModalVisible(false);
      setEditingSeries(null);
      seriesForm.resetFields();
      loadSeries();
    } catch (error: any) {
      message.error(error.response?.data?.detail || '更新系列失败');
    }
  };

  const handleDeleteSeries = async (seriesId: string) => {
    try {
      await paletteApi.deleteSeries(seriesId);
      message.success('系列删除成功');
      loadSeries();
      loadColors();
    } catch (error: any) {
      message.error(error.response?.data?.detail || '删除系列失败');
    }
  };

  const handleSeriesDragStart = (index: number) => {
    setDraggedSeriesIndex(index);
  };

  const handleSeriesDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedSeriesIndex === null || draggedSeriesIndex === index) return;
    
    const newSeries = [...series];
    const draggedItem = newSeries[draggedSeriesIndex];
    newSeries.splice(draggedSeriesIndex, 1);
    newSeries.splice(index, 0, draggedItem);
    setSeries(newSeries);
    setDraggedSeriesIndex(index);
  };

  const handleSeriesDragEnd = async () => {
    if (draggedSeriesIndex === null) return;
    
    try {
      const orders = series.map((s, index) => ({
        id: s.id,
        display_order: index
      }));
      await paletteApi.batchReorderSeries(orders);
      message.success('排序更新成功');
    } catch (error) {
      message.error('排序更新失败');
      loadSeries();
    } finally {
      setDraggedSeriesIndex(null);
    }
  };

  const handleBatchDeleteSeries = async () => {
    if (selectedSeriesKeys.length === 0) {
      message.warning('请先选择要删除的系列');
      return;
    }
    
    try {
      const result = await paletteApi.batchDeleteSeries(selectedSeriesKeys as string[]);
      message.success(result.message);
      setSelectedSeriesKeys([]);
      loadSeries();
      loadColors();
    } catch (error: any) {
      message.error(error.response?.data?.detail || '批量删除失败');
    }
  };

  const handleExportSeries = async () => {
    try {
      const seriesIds = selectedSeriesKeys.length > 0 ? selectedSeriesKeys as string[] : undefined;
      const data = await paletteApi.exportSeries(seriesIds);
      
      const headers = ['brand_code', 'brand_name', 'series_code', 'series_name', 'color_code', 'color_name', 'hex', 'is_transparent', 'is_glow', 'is_metallic'];
      const csvContent = [
        headers.join(','),
        ...data.map((row: any) => headers.map(h => row[h]).join(','))
      ].join('\n');
      
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `series_export_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
      message.success(`成功导出 ${data.length} 条数据`);
    } catch (error: any) {
      message.error(error.response?.data?.detail || '导出失败');
    }
  };

  const openSeriesModal = (series?: Series) => {
    if (series) {
      setEditingSeries(series);
      seriesForm.setFieldsValue({
        name: series.name,
        code: series.code,
        description: series.description,
        brand_id: series.brand_id,
        is_active: series.is_active,
        is_default: series.is_default,
        display_order: series.display_order
      });
    } else {
      setEditingSeries(null);
      seriesForm.resetFields();
      if (selectedBrandForSeries) {
        seriesForm.setFieldsValue({ brand_id: selectedBrandForSeries });
      }
    }
    setSeriesModalVisible(true);
  };

  // ========== Color Functions ==========
  const loadColors = async (seriesId?: string) => {
    try {
      setColorsLoading(true);
      const data = await paletteApi.getColors(seriesId);
      setColors(data);
    } catch (error) {
      message.error('加载颜色失败');
      console.error('Load colors error:', error);
    } finally {
      setColorsLoading(false);
    }
  };

  const handleCreateColor = async (values: ColorFormData) => {
    if (!selectedSeriesForColor) {
      message.error('请先选择系列');
      return;
    }
    try {
      await paletteApi.createColor(selectedSeriesForColor, values);
      message.success('颜色创建成功');
      setColorModalVisible(false);
      colorForm.resetFields();
      loadColors();
      loadSeries();
    } catch (error: any) {
      message.error(error.response?.data?.detail || '创建颜色失败');
    }
  };

  const handleUpdateColor = async (values: ColorFormData) => {
    if (!editingColor) return;
    try {
      await paletteApi.updateColor(editingColor.id, values);
      message.success('颜色更新成功');
      setColorModalVisible(false);
      setEditingColor(null);
      colorForm.resetFields();
      loadColors();
    } catch (error: any) {
      message.error(error.response?.data?.detail || '更新颜色失败');
    }
  };

  const handleDeleteColor = async (colorId: string) => {
    try {
      await paletteApi.deleteColor(colorId);
      message.success('颜色删除成功');
      loadColors();
      loadSeries();
    } catch (error: any) {
      message.error(error.response?.data?.detail || '删除颜色失败');
    }
  };

  const openColorModal = (color?: Color) => {
    if (color) {
      setEditingColor(color);
      colorForm.setFieldsValue({
        color_code: color.color_code,
        name: color.name,
        hex: color.hex,
        is_transparent: color.is_transparent,
        is_glow: color.is_glow,
        is_metallic: color.is_metallic,
        display_order: color.display_order
      });
    } else {
      setEditingColor(null);
      colorForm.resetFields();
    }
    setColorModalVisible(true);
  };

  // ========== Import Functions ==========
  const parseCSV = (content: string): ColorImportRow[] => {
    const lines = content.trim().split('\n');
    const rows: ColorImportRow[] = [];
    
    // Skip header if present
    const startIndex = lines[0].includes('brand_code') ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Handle quoted CSV values
      const parts: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if ((char === ',' || char === '\t') && !inQuotes) {
          parts.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      parts.push(current.trim());
      
      if (parts.length >= 7) {
        rows.push({
          brand_code: parts[0].replace(/^"|"$/g, ''),
          brand_name: parts[1].replace(/^"|"$/g, ''),
          series_code: parts[2].replace(/^"|"$/g, ''),
          series_name: parts[3].replace(/^"|"$/g, ''),
          color_code: parts[4].replace(/^"|"$/g, ''),
          color_name: parts[5].replace(/^"|"$/g, '') || undefined,
          hex: parts[6].replace(/^"|"$/g, ''),
          is_transparent: parts[7]?.replace(/^"|"$/g, '').toLowerCase() === 'true',
          is_glow: parts[8]?.replace(/^"|"$/g, '').toLowerCase() === 'true' || false,
          is_metallic: parts[9]?.replace(/^"|"$/g, '').toLowerCase() === 'true' || false
        });
      }
    }
    
    return rows;
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setImportData(content);
        setFileName(file.name);
        const rows = parseCSV(content);
        if (rows.length > 0) {
          setParsedData(rows);
          setPreviewVisible(true);
          message.success(`成功解析 ${rows.length} 条数据`);
        } else {
          message.error('未能解析出有效数据，请检查文件格式');
        }
      }
    };
    reader.readAsText(file);
    return false; // Prevent default upload
  };

  const handleConfirmImport = async () => {
    if (parsedData.length === 0) {
      message.error('没有可导入的数据');
      return;
    }
    
    try {
      setImporting(true);
      setImportResult(null);
      
      const result = await paletteApi.importColors(parsedData, true, true);
      setImportResult({
        success: result.imported,
        failed: result.failed,
        errors: result.errors
      });
      
      if (result.imported > 0) {
        message.success(`成功导入 ${result.imported} 条颜色数据`);
        loadBrands();
        loadSeries();
        loadColors();
        setPreviewVisible(false);
        setImportModalVisible(false);
        setParsedData([]);
        setImportData('');
        setFileName('');
      } else {
        message.error('导入失败，请检查数据格式');
      }
    } catch (error: any) {
      console.error('Import error:', error);
      
      // 处理不同类型的错误
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        message.error('导入超时，请减少数据量后重试（建议每次不超过500条）');
      } else if (error.response?.status === 413) {
        message.error('数据量过大，请分批导入（建议每次不超过500条）');
      } else if (error.response?.status === 401) {
        message.error('登录已过期，请重新登录');
      } else if (error.response?.status >= 500) {
        message.error('服务器错误，请稍后重试');
      } else {
        message.error(error.response?.data?.detail || error.message || '导入失败，请检查网络连接');
      }
      
      setImportResult({
        success: 0,
        failed: parsedData.length,
        errors: [error.message || '导入请求失败']
      });
    } finally {
      setImporting(false);
    }
  };

  const handleImport = async () => {
    if (!importData.trim()) {
      message.error('请先上传CSV文件');
      return;
    }
    // This is now handled by handleConfirmImport
  };

  const downloadTemplate = () => {
    const template = `brand_code,brand_name,series_code,series_name,color_code,color_name,hex,is_transparent,is_glow,is_metallic
perler,Perler,std,标准系列,A1,黑色,#000000,false,false,false
perler,Perler,std,标准系列,A2,白色,#FFFFFF,false,false,false
perler,Perler,glow,夜光系列,G1,夜光绿,#00FF00,false,true,false
hama,Hama,mini,Mini系列,M1,红色,#FF0000,false,false,false`;
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'color_import_template.csv';
    link.click();
  };

  // ========== Table Columns ==========
  const brandColumns: ColumnsType<Brand> = [
    {
      title: '',
      key: 'drag',
      width: 40,
      render: (_, __, index) => (
        <HolderOutlined 
          style={{ cursor: 'grab', color: '#999' }}
          onMouseDown={() => handleBrandDragStart(index)}
        />
      )
    },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '代码', dataIndex: 'code', key: 'code' },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { 
      title: '状态', 
      dataIndex: 'is_active', 
      key: 'is_active',
      render: (active) => active ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>
    },
    { title: '系列数', dataIndex: 'series_count', key: 'series_count' },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openBrandModal(record)}>编辑</Button>
          <Popconfirm title="确定删除此品牌吗？将同时删除其下所有系列和颜色！" onConfirm={() => handleDeleteBrand(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const brandRowSelection: TableRowSelection<Brand> = {
    selectedRowKeys: selectedBrandKeys,
    onChange: (selectedKeys) => setSelectedBrandKeys(selectedKeys),
  };

  const seriesColumns: ColumnsType<Series> = [
    {
      title: '',
      key: 'drag',
      width: 40,
      render: (_, __, index) => (
        <HolderOutlined 
          style={{ cursor: 'grab', color: '#999' }}
          onMouseDown={() => handleSeriesDragStart(index)}
        />
      )
    },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '代码', dataIndex: 'code', key: 'code' },
    { title: '品牌', dataIndex: 'brand_name', key: 'brand_name' },
    { 
      title: '默认', 
      dataIndex: 'is_default', 
      key: 'is_default',
      render: (isDefault) => isDefault ? <Tag color="blue">是</Tag> : <Tag>否</Tag>
    },
    { 
      title: '状态', 
      dataIndex: 'is_active', 
      key: 'is_active',
      render: (active) => active ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>
    },
    { title: '颜色数', dataIndex: 'color_count', key: 'color_count' },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedSeriesForColor(record.id); loadColors(record.id); setActiveTab('colors'); }}>查看颜色</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openSeriesModal(record)}>编辑</Button>
          <Popconfirm title="确定删除此系列吗？将同时删除其下所有颜色！" onConfirm={() => handleDeleteSeries(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const seriesRowSelection: TableRowSelection<Series> = {
    selectedRowKeys: selectedSeriesKeys,
    onChange: (selectedKeys) => setSelectedSeriesKeys(selectedKeys),
  };

  const colorColumns: ColumnsType<Color> = [
    { 
      title: '颜色', 
      dataIndex: 'hex', 
      key: 'hex',
      render: (hex) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, backgroundColor: hex, border: '1px solid #ddd', borderRadius: 4 }} />
          <span>{hex}</span>
        </div>
      )
    },
    { title: '编号', dataIndex: 'color_code', key: 'color_code' },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { 
      title: '属性', 
      key: 'attributes',
      render: (_, record) => (
        <Space>
          {record.is_transparent && <Tag color="cyan">透明</Tag>}
          {record.is_glow && <Tag color="purple">夜光</Tag>}
          {record.is_metallic && <Tag color="gold">金属</Tag>}
        </Space>
      )
    },
    { title: '系列', dataIndex: 'series_name', key: 'series_name' },
    { title: '品牌', dataIndex: 'brand_name', key: 'brand_name' },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openColorModal(record)}>编辑</Button>
          <Popconfirm title="确定删除此颜色吗？" onConfirm={() => handleDeleteColor(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // ========== Render ==========
  return (
    <Card title="色彩库管理" extra={
      <Space>
        <Button icon={<ImportOutlined />} onClick={() => setImportModalVisible(true)}>批量导入</Button>
        <Button icon={<ReloadOutlined />} onClick={() => { loadBrands(); loadSeries(); loadColors(); }}>刷新</Button>
      </Space>
    }>
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="品牌管理" key="brands">
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openBrandModal()}>
                添加品牌
              </Button>
              <Popconfirm 
                title={`确定删除选中的 ${selectedBrandKeys.length} 个品牌吗？将同时删除其下所有系列和颜色！`}
                onConfirm={handleBatchDeleteBrands}
                disabled={selectedBrandKeys.length === 0}
              >
                <Button 
                  danger 
                  icon={<DeleteOutlined />}
                  disabled={selectedBrandKeys.length === 0}
                >
                  删除选中 ({selectedBrandKeys.length})
                </Button>
              </Popconfirm>
              <Button 
                icon={<ExportOutlined />}
                onClick={handleExportBrands}
              >
                导出{selectedBrandKeys.length > 0 ? ` (${selectedBrandKeys.length})` : '全部'}
              </Button>
            </Space>
          </div>
          <Table 
            columns={brandColumns} 
            dataSource={brands} 
            loading={brandLoading}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            rowSelection={brandRowSelection}
            onRow={(_, index) => ({
              draggable: true,
              onDragStart: () => handleBrandDragStart(index!),
              onDragOver: (e) => handleBrandDragOver(e, index!),
              onDragEnd: handleBrandDragEnd,
              style: { cursor: 'grab' }
            })}
          />
        </TabPane>
        
        <TabPane tab="系列管理" key="series">
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openSeriesModal()}>
                添加系列
              </Button>
              <Select 
                placeholder="筛选品牌" 
                allowClear 
                style={{ width: 200 }}
                onChange={(val) => { setSelectedBrandForSeries(val); loadSeries(val); }}
              >
                {brands.map(b => <Option key={b.id} value={b.id}>{b.name}</Option>)}
              </Select>
              <Popconfirm 
                title={`确定删除选中的 ${selectedSeriesKeys.length} 个系列吗？将同时删除其下所有颜色！`}
                onConfirm={handleBatchDeleteSeries}
                disabled={selectedSeriesKeys.length === 0}
              >
                <Button 
                  danger 
                  icon={<DeleteOutlined />}
                  disabled={selectedSeriesKeys.length === 0}
                >
                  删除选中 ({selectedSeriesKeys.length})
                </Button>
              </Popconfirm>
              <Button 
                icon={<ExportOutlined />}
                onClick={handleExportSeries}
              >
                导出{selectedSeriesKeys.length > 0 ? ` (${selectedSeriesKeys.length})` : '全部'}
              </Button>
            </Space>
          </div>
          <Table 
            columns={seriesColumns} 
            dataSource={series} 
            loading={seriesLoading}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            rowSelection={seriesRowSelection}
            onRow={(_, index) => ({
              draggable: true,
              onDragStart: () => handleSeriesDragStart(index!),
              onDragOver: (e) => handleSeriesDragOver(e, index!),
              onDragEnd: handleSeriesDragEnd,
              style: { cursor: 'grab' }
            })}
          />
        </TabPane>
        
        <TabPane tab="颜色管理" key="colors">
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openColorModal()}>
                添加颜色
              </Button>
              <Select 
                placeholder="筛选系列" 
                allowClear 
                style={{ width: 200 }}
                onChange={(val) => { setSelectedSeriesForColor(val); loadColors(val); }}
              >
                {series.map(s => <Option key={s.id} value={s.id}>{s.brand_name} - {s.name}</Option>)}
              </Select>
            </Space>
          </div>
          <Table 
            columns={colorColumns} 
            dataSource={colors} 
            loading={colorsLoading}
            rowKey="id"
            pagination={{ pageSize: 20 }}
          />
        </TabPane>
      </Tabs>

      {/* Brand Modal */}
      <Modal
        title={editingBrand ? '编辑品牌' : '添加品牌'}
        open={brandModalVisible}
        onOk={() => brandForm.submit()}
        onCancel={() => { setBrandModalVisible(false); setEditingBrand(null); brandForm.resetFields(); }}
      >
        <Form form={brandForm} onFinish={editingBrand ? handleUpdateBrand : handleCreateBrand} layout="vertical" initialValues={{ is_active: true, display_order: 0 }}>
          <Form.Item name="name" label="品牌名称" rules={[{ required: true, message: '请输入品牌名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="code" label="品牌代码" rules={[{ required: true, message: '请输入品牌代码' }]}>
            <Input placeholder="如：perler, hama" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item name="logo_url" label="Logo URL">
            <Input />
          </Form.Item>
          <Form.Item name="is_active" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="display_order" label="显示顺序">
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Series Modal */}
      <Modal
        title={editingSeries ? '编辑系列' : '添加系列'}
        open={seriesModalVisible}
        onOk={() => seriesForm.submit()}
        onCancel={() => { setSeriesModalVisible(false); setEditingSeries(null); seriesForm.resetFields(); }}
      >
        <Form form={seriesForm} onFinish={editingSeries ? handleUpdateSeries : handleCreateSeries} layout="vertical" initialValues={{ is_active: true, display_order: 0 }}>
          <Form.Item name="brand_id" label="所属品牌" rules={[{ required: true, message: '请选择品牌' }]}>
            <Select placeholder="选择品牌" disabled={!!editingSeries}>
              {brands.map(b => <Option key={b.id} value={b.id}>{b.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="name" label="系列名称" rules={[{ required: true, message: '请输入系列名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="code" label="系列代码" rules={[{ required: true, message: '请输入系列代码' }]}>
            <Input placeholder="如：std, mini, glow" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item name="is_default" label="设为默认" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="is_active" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="display_order" label="显示顺序">
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Color Modal */}
      <Modal
        title={editingColor ? '编辑颜色' : '添加颜色'}
        open={colorModalVisible}
        onOk={() => colorForm.submit()}
        onCancel={() => { setColorModalVisible(false); setEditingColor(null); colorForm.resetFields(); }}
      >
        <Form form={colorForm} onFinish={editingColor ? handleUpdateColor : handleCreateColor} layout="vertical" initialValues={{ display_order: 0 }}>
          {!editingColor && (
            <Form.Item label="所属系列" required>
              <Select 
                placeholder="选择系列" 
                value={selectedSeriesForColor}
                onChange={setSelectedSeriesForColor}
              >
                {series.map(s => <Option key={s.id} value={s.id}>{s.brand_name} - {s.name}</Option>)}
              </Select>
            </Form.Item>
          )}
          <Form.Item name="color_code" label="颜色编号" rules={[{ required: true, message: '请输入颜色编号' }]}>
            <Input placeholder="如：A1, B12" />
          </Form.Item>
          <Form.Item name="name" label="颜色名称">
            <Input />
          </Form.Item>
          <Form.Item name="hex" label="HEX值" rules={[{ required: true, message: '请输入HEX值' }]}>
            <Input placeholder="#RRGGBB" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="is_transparent" label="透明" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="is_glow" label="夜光" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="is_metallic" label="金属" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="display_order" label="显示顺序">
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Import Modal - File Upload */}
      <Modal
        title="批量导入颜色"
        open={importModalVisible}
        onCancel={() => { 
          setImportModalVisible(false); 
          setImportData(''); 
          setImportResult(null); 
          setParsedData([]);
          setFileName('');
        }}
        footer={null}
        width={700}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            message="导入格式说明"
            description={
              <div>
                <p>请上传 CSV 文件，每行一条记录，包含以下字段：</p>
                <p><code>brand_code, brand_name, series_code, series_name, color_code, color_name, hex, is_transparent, is_glow, is_metallic</code></p>
                <p>如果不存在的品牌或系列会自动创建。</p>
              </div>
            }
            type="info"
            showIcon
          />
          
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
            <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>下载模板</Button>
            <Upload
              accept=".csv,.txt"
              beforeUpload={handleFileUpload}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />} type="primary">选择CSV文件</Button>
            </Upload>
            {fileName && <Tag color="blue">{fileName}</Tag>}
          </div>

          {previewVisible && parsedData.length > 0 && (
            <>
              <Alert
                message={`数据预览：共 ${parsedData.length} 条记录`}
                type="success"
                showIcon
              />
              <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid #d9d9d9', borderRadius: 6 }}>
                <Table
                  dataSource={parsedData.map((row, idx) => ({ ...row, key: idx }))}
                  columns={[
                    { title: '品牌', dataIndex: 'brand_code', width: 80 },
                    { title: '系列', dataIndex: 'series_code', width: 80 },
                    { title: '颜色编号', dataIndex: 'color_code', width: 90 },
                    { title: '颜色名', dataIndex: 'color_name', width: 100 },
                    { 
                      title: '色值', 
                      dataIndex: 'hex', 
                      width: 80,
                      render: (hex) => (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 16, height: 16, backgroundColor: hex, border: '1px solid #d9d9d9' }} />
                          <span>{hex}</span>
                        </div>
                      )
                    },
                    { 
                      title: '属性', 
                      width: 120,
                      render: (_, row) => (
                        <Space size={4}>
                          {row.is_transparent && <Tag size="small">透明</Tag>}
                          {row.is_glow && <Tag size="small" color="green">夜光</Tag>}
                          {row.is_metallic && <Tag size="small" color="gold">金属</Tag>}
                        </Space>
                      )
                    },
                  ]}
                  pagination={false}
                  size="small"
                  scroll={{ y: 240 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                <Button onClick={() => { setPreviewVisible(false); setParsedData([]); setFileName(''); }}>
                  重新选择
                </Button>
                <Button type="primary" loading={importing} onClick={handleConfirmImport}>
                  确认导入
                </Button>
              </div>
            </>
          )}

          {importResult && (
            <Alert
              message={`导入结果：成功 ${importResult.success} 条，失败 ${importResult.failed} 条`}
              description={
                importResult.errors.length > 0 && (
                  <div style={{ maxHeight: 200, overflow: 'auto' }}>
                    {importResult.errors.map((err, idx) => <div key={idx}>{err}</div>)}
                  </div>
                )
              }
              type={importResult.failed === 0 ? 'success' : 'warning'}
            />
          )}
        </Space>
      </Modal>
    </Card>
  );
};
