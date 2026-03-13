import React, { useEffect, useCallback } from 'react';
import { Card, Form, Slider, Button, Typography, message } from 'antd';
import { useImageStore } from '../../stores/useImageStore';
import { applyAdjustmentsToImage } from '../../utils/imageUtils';
import { debounce } from 'lodash-es';

const { Text } = Typography;

export const ImageEditor: React.FC = () => {
  const {
    originalWidth,
    originalHeight,
    dataUrl,
    editedDataUrl,
    adjustments,
    setAdjustments,
    setEditedDataUrl,
    resetAdjustments
  } = useImageStore();

  // 防抖处理的调整函数
  const debouncedApplyAdjustments = useCallback(
    debounce(async (dataUrl: string, adjustments: any) => {
      try {
        const result = await applyAdjustmentsToImage(dataUrl, adjustments);
        setEditedDataUrl(result);
      } catch (error) {
        console.error('Failed to apply adjustments:', error);
        message.error('应用调整失败');
      }
    }, 300),
    [setEditedDataUrl]
  );

  // 监听调整参数变化，更新编辑后的图片
  useEffect(() => {
    if (dataUrl) {
      debouncedApplyAdjustments(dataUrl, adjustments);
    }
  }, [dataUrl, adjustments, debouncedApplyAdjustments]);

  if (!originalWidth || !originalHeight) {
    return (
      <Card size="small" style={{ marginTop: 12 }}>
        <Text type="secondary">请先上传图片，然后进行基础调整。</Text>
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
