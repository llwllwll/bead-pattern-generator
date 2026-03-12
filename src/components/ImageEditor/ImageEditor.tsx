import React, { useMemo } from 'react';
import { Card, Form, InputNumber, Switch, Slider, Space, Button, Typography } from 'antd';
import { useImageStore } from '../../stores/useImageStore';

const { Text } = Typography;

const BEAD_SIZE_MM = 5;

export const ImageEditor: React.FC = () => {
  const {
    originalWidth,
    originalHeight,
    dimensions,
    setDimensions,
    adjustments,
    setAdjustments,
    resetAdjustments
  } = useImageStore();

  const physicalSize = useMemo(() => {
    if (!dimensions) return null;
    const widthMm = dimensions.width * BEAD_SIZE_MM;
    const heightMm = dimensions.height * BEAD_SIZE_MM;
    return {
      widthCm: (widthMm / 10).toFixed(1),
      heightCm: (heightMm / 10).toFixed(1)
    };
  }, [dimensions]);

  if (!originalWidth || !originalHeight || !dimensions) {
    return (
      <Card size="small" style={{ marginTop: 12 }}>
        <Text type="secondary">请先上传图片，然后进行尺寸与基础调整。</Text>
      </Card>
    );
  }

  return (
    <Card size="small" style={{ marginTop: 12 }} title="图片编辑">
      <Form layout="vertical">
        <Form.Item label="原始尺寸">
          <Text type="secondary">
            {originalWidth} × {originalHeight} px
          </Text>
        </Form.Item>
        <Form.Item label="目标尺寸（按拼豆颗粒数）">
          <Space>
            <InputNumber
              min={10}
              max={200}
              value={dimensions.width}
              addonAfter="宽"
              onChange={(v) =>
                setDimensions({
                  width: Number(v) || 10
                })
              }
              style={{ width: 140 }}
            />
            <InputNumber
              min={10}
              max={200}
              value={dimensions.height}
              addonAfter="高"
              onChange={(v) =>
                setDimensions({
                  height: Number(v) || 10
                })
              }
              style={{ width: 140 }}
            />
            <Space>
              <Switch
                checked={dimensions.lockRatio}
                onChange={(val) => setDimensions({ lockRatio: val })}
                size="small"
              />
              <Text type="secondary">锁定宽高比</Text>
            </Space>
          </Space>
          {physicalSize && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                物理尺寸约为 {physicalSize.widthCm} × {physicalSize.heightCm} cm（按
                {BEAD_SIZE_MM}mm 颗粒）
              </Text>
            </div>
          )}
        </Form.Item>

        <Form.Item label="亮度">
          <Slider
            min={-100}
            max={100}
            value={adjustments.brightness}
            onChange={(val) =>
              setAdjustments({
                brightness: Number(val)
              })
            }
          />
        </Form.Item>
        <Form.Item label="对比度">
          <Slider
            min={-100}
            max={100}
            value={adjustments.contrast}
            onChange={(val) =>
              setAdjustments({
                contrast: Number(val)
              })
            }
          />
        </Form.Item>
        <Form.Item label="饱和度">
          <Slider
            min={-100}
            max={100}
            value={adjustments.saturation}
            onChange={(val) =>
              setAdjustments({
                saturation: Number(val)
              })
            }
          />
        </Form.Item>
        <Button onClick={resetAdjustments} block>
          重置调整
        </Button>
      </Form>
    </Card>
  );
};

