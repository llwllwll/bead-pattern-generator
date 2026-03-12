import React, { useEffect } from 'react';
import { Card, Form, Slider, Select, Radio, Space, Typography, Tooltip, Divider } from 'antd';
import { LockOutlined, UnlockOutlined } from '@ant-design/icons';
import { usePatternStore } from '../../stores/usePatternStore';
import { useImageStore } from '../../stores/useImageStore';

const { Text } = Typography;

export const ControlPanel: React.FC = () => {
  const { params, setParams } = usePatternStore();
  const { originalWidth, originalHeight } = useImageStore();

  // 计算图片比例
  const imageRatio = originalWidth && originalHeight ? originalWidth / originalHeight : 1;

  // 当锁定比例时，自动调整高度
  useEffect(() => {
    if (params.lockRatio && imageRatio) {
      const newHeight = Math.round(params.width / imageRatio);
      if (newHeight !== params.height) {
        setParams({ height: newHeight });
      }
    }
  }, [params.width, params.lockRatio, imageRatio, setParams]);

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
          拼豆参数设置
        </Typography.Title>
      </div>
      
      <div style={{ 
        backgroundColor: 'var(--card-background)',
        borderRadius: 'var(--border-radius)',
        padding: 'var(--spacing-lg)',
        boxShadow: 'var(--box-shadow)'
      }}>
        <Form layout="vertical">
          <Form.Item label="目标尺寸（颗粒数）">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                <div style={{ flex: 1 }}>
                  <Text style={{ display: 'block', marginBottom: 'var(--spacing-xs)', color: 'var(--text-secondary)' }}>
                    宽度: {params.width} 颗粒
                  </Text>
                  <Slider
                    min={10}
                    max={200}
                    value={params.width}
                    onChange={(v) => setParams({ width: Number(v) })}
                    tooltip={{ formatter: (value) => `${value} 颗粒` }}
                  />
                </div>
                <Tooltip title={params.lockRatio ? '锁定比例' : '解锁比例'}>
                  <button
                    type="button"
                    onClick={() => setParams({ lockRatio: !params.lockRatio })}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      backgroundColor: params.lockRatio ? 'rgba(52, 152, 219, 0.1)' : 'transparent',
                      color: params.lockRatio ? 'var(--primary-color)' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {params.lockRatio ? <LockOutlined /> : <UnlockOutlined />}
                  </button>
                </Tooltip>
              </div>
              
              <div style={{ flex: 1 }}>
                <Text style={{ display: 'block', marginBottom: 'var(--spacing-xs)', color: 'var(--text-secondary)' }}>
                  高度: {params.height} 颗粒
                </Text>
                <Slider
                  min={10}
                  max={200}
                  value={params.height}
                  onChange={(v) => setParams({ height: Number(v) })}
                  tooltip={{ formatter: (value) => `${value} 颗粒` }}
                  disabled={params.lockRatio}
                />
              </div>
            </Space>
          </Form.Item>
          
          <Divider style={{ margin: 'var(--spacing-md) 0' }} />
          
          <div style={{ 
            padding: 'var(--spacing-sm)',
            backgroundColor: 'rgba(52, 152, 219, 0.05)',
            borderRadius: '8px',
            marginBottom: 'var(--spacing-md)'
          }}>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              <strong>尺寸与精度关系：</strong>
              <br />- 小尺寸（10-50颗粒）：生成速度快，适合简单图案
              <br />- 中等尺寸（51-100颗粒）：平衡速度和细节
              <br />- 大尺寸（101-200颗粒）：细节丰富，适合复杂图案
              <br />{originalWidth && originalHeight && (
                <span>当前图片比例：{originalWidth} × {originalHeight} ({imageRatio.toFixed(2)}:1)</span>
              )}
            </Text>
          </div>
          
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
          
          <Form.Item label="抖动算法">
            <Select
              value={params.dithering}
              onChange={(v) => setParams({ dithering: v })}
              options={[
                { value: 'none', label: '无抖动' },
                { value: 'floyd-steinberg', label: 'Floyd-Steinberg' },
                { value: 'atkinson', label: 'Atkinson' }
              ]}
              size="small"
              style={{ width: '100%' }}
            />
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
                    <input
                      type="color"
                      value={params.transparencyColor}
                      onChange={(e) => setParams({ transparencyColor: e.target.value })}
                      style={{ width: 40, border: 'none', padding: 0, background: 'none' }}
                    />
                  </Space>
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
          
          <Text type="secondary" style={{ fontSize: '14px' }}>
            参数变更会在短暂延迟后自动更新预览图，以保证交互流畅。
          </Text>
        </Form>
      </div>
    </div>
  );
};

