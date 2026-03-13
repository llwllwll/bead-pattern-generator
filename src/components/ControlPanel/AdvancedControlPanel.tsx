import React, { useMemo } from 'react';
import { Card, Form, Slider, Select, Radio, Space, Typography, Tooltip, Button } from 'antd';
import { QuestionCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { usePatternStore } from '../../stores/usePatternStore';
import { useImageStore } from '../../stores/useImageStore';
import { generatePatternFromImage } from '../../utils/imageUtils';
import { message } from 'antd';

const { Text } = Typography;

// 抖动算法说明
const ditheringDescriptions: Record<string, string> = {
  'none': '不使用抖动算法，颜色过渡较生硬，但颜色还原最准确',
  'floyd-steinberg': '经典抖动算法，在颜色间添加噪点使过渡更平滑，适合渐变丰富的图片',
  'atkinson': '苹果经典算法，保留更多细节，适合线条清晰的图案'
};

export const AdvancedControlPanel: React.FC = () => {
  const { params, setParams, paletteList, setPatternCells, setProcessing } = usePatternStore();
  const { editedDataUrl } = useImageStore();

  // 更新预览函数
  const handleUpdatePreview = async () => {
    if (!editedDataUrl) {
      message.warning('请先上传图片');
      return;
    }

    message.loading('正在更新预览...', 0);
    setProcessing(true);
    
    try {
      const palette = paletteList.find(p => p.id === params.paletteId);
      if (!palette) {
        message.error('未找到选中的色板');
        return;
      }

      const cells = await generatePatternFromImage(
        editedDataUrl,
        params,
        palette
      );
      
      setPatternCells(cells);
      message.success('预览更新成功！');
    } catch (error) {
      console.error('更新预览失败:', error);
      message.error('更新预览失败，请重试');
    } finally {
      setProcessing(false);
      message.destroy();
    }
  };

  // 获取当前色板的颜色选项
  const currentPalette = useMemo(() => {
    return paletteList.find((p) => p.id === params.paletteId);
  }, [paletteList, params.paletteId]);

  const colorOptions = useMemo(() => {
    return currentPalette?.colors.map((c) => ({
      value: c.hex,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            width: '20px', 
            height: '20px', 
            borderRadius: '4px', 
            backgroundColor: c.hex,
            border: '1px solid rgba(0,0,0,0.1)'
          }} />
          <span>{c.colorCode || ''} {c.name || ''}</span>
        </div>
      ),
    })) || [];
  }, [currentPalette]);

  return (
    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: 'var(--spacing-md)',
        gap: 'var(--spacing-sm)'
      }}>
        <div style={{
          width: '4px',
          height: '20px',
          backgroundColor: 'var(--primary-color)',
          borderRadius: '2px'
        }} />
        <Typography.Title level={5} style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--text-primary)'
        }}>
          高级设置
        </Typography.Title>
      </div>

      <div style={{
        backgroundColor: 'var(--card-background)',
        borderRadius: 'var(--border-radius)',
        padding: 'var(--spacing-lg)',
        boxShadow: 'var(--box-shadow)'
      }}>
        <Form layout="vertical">
          <Form.Item label="边缘平滑度">
            <Slider
              min={0}
              max={100}
              value={params.edgeSmooth}
              onChange={(v) => setParams({ edgeSmooth: Number(v) })}
              tooltip={{ formatter: (value) => `${value}%` }}
            />
          </Form.Item>

          <Form.Item label="颜色容差">
            <Slider
              min={0}
              max={100}
              value={params.colorTolerance}
              onChange={(v) => setParams({ colorTolerance: Number(v) })}
              tooltip={{ formatter: (value) => `${value}%` }}
            />
          </Form.Item>

          <Form.Item
            label={
              <Space>
                <span>抖动算法</span>
                <Tooltip title={ditheringDescriptions[params.dithering]}>
                  <QuestionCircleOutlined style={{ color: 'var(--text-secondary)' }} />
                </Tooltip>
              </Space>
            }
          >
            <Select
              value={params.dithering}
              onChange={(v) => setParams({ dithering: v })}
              options={[
                { value: 'none', label: '无抖动 - 颜色还原最准确' },
                { value: 'floyd-steinberg', label: 'Floyd-Steinberg - 平滑渐变效果' },
                { value: 'atkinson', label: 'Atkinson - 保留更多细节' }
              ]}
              size="small"
              style={{ width: '100%' }}
            />
            <Text type="secondary" style={{ fontSize: '12px', marginTop: 4, display: 'block' }}>
              {ditheringDescriptions[params.dithering]}
            </Text>
          </Form.Item>

          <Form.Item label="透明度处理">
            <Radio.Group
              value={params.transparencyMode}
              onChange={(e) => setParams({ transparencyMode: e.target.value })}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Radio value="keep">保留透明</Radio>
                <Radio value="white">替换为白色</Radio>
                <Radio value="custom">
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <span>替换为指定颜色</span>
                  </Space>
                </Radio>
              </Space>
            </Radio.Group>
            {params.transparencyMode === 'custom' && (
              <Select
                value={params.transparencyColor}
                onChange={(v) => setParams({ transparencyColor: v })}
                options={colorOptions}
                size="small"
                style={{ width: '100%', marginTop: 8 }}
                placeholder="从色库中选择颜色"
              />
            )}
          </Form.Item>

          <Text type="secondary" style={{ fontSize: '14px', marginBottom: 'var(--spacing-md)', display: 'block' }}>
            调整参数后点击下方按钮更新预览，不占用生成次数。
          </Text>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleUpdatePreview}
            style={{ width: '100%' }}
          >
            更新预览
          </Button>
        </Form>
      </div>
    </div>
  );
};
