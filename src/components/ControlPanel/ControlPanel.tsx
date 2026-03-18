import React, { useEffect, useMemo } from 'react';
import { Card, Form, Slider, Select, Radio, Space, Typography, Tooltip, Divider } from 'antd';
import { LockOutlined, UnlockOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { usePatternStore } from '../../stores/usePatternStore';
import { useImageStore } from '../../stores/useImageStore';

const { Text } = Typography;

// 抖动算法说明
const ditheringDescriptions: Record<string, string> = {
  'none': '不使用抖动算法，颜色过渡较生硬，但颜色还原最准确',
  'floyd-steinberg': '经典抖动算法，在颜色间添加噪点使过渡更平滑，适合渐变丰富的图片',
  'atkinson': '苹果经典算法，保留更多细节，适合线条清晰的图案'
};

export const ControlPanel: React.FC = () => {
  const { params, setParams, currentSeries } = usePatternStore();
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

  const colorOptions = useMemo(() => {
    return currentSeries?.colors.map((c) => ({
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
  }, [currentSeries]);

  // 计算物理尺寸
  const physicalSize = useMemo(() => {
    const widthMm = params.width * params.beadSize;
    const heightMm = params.height * params.beadSize;
    return {
      widthCm: (widthMm / 10).toFixed(1),
      heightCm: (heightMm / 10).toFixed(1)
    };
  }, [params.width, params.height, params.beadSize]);

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
          {/* 拼豆尺寸选择 */}
          <Form.Item label="拼豆颗粒尺寸">
            <Select
              value={params.beadSize}
              onChange={(v) => setParams({ beadSize: Number(v) })}
              options={[
                { value: 2.6, label: '2.6mm (迷你拼豆)' },
                { value: 5, label: '5mm (标准拼豆)' },
                { value: 10, label: '10mm (大颗拼豆)' }
              ]}
              size="small"
              style={{ width: '100%' }}
            />
            <Text type="secondary" style={{ fontSize: '12px', marginTop: 4, display: 'block' }}>
              预估成品尺寸: {physicalSize.widthCm} × {physicalSize.heightCm} cm
            </Text>
          </Form.Item>

          <Divider style={{ margin: 'var(--spacing-md) 0' }} />

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

          <Text type="secondary" style={{ fontSize: '14px' }}>
            参数变更会在短暂延迟后自动更新预览图，以保证交互流畅。
          </Text>
        </Form>
      </div>
    </div>
  );
};
