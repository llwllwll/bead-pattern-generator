import React, { useCallback, useState } from 'react';
import { Upload, Typography, Space, message } from 'antd';
import type { UploadProps } from 'antd';
import { InboxOutlined, PictureOutlined } from '@ant-design/icons';
import { useImageStore } from '../../stores/useImageStore';

const { Dragger } = Upload;
const { Text } = Typography;

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

export const ImageUploader: React.FC = () => {
  const setFile = useImageStore((s) => s.setFile);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [info, setInfo] = useState<{ width: number; height: number; sizeKB: number }>();

  const handleFile = useCallback(
    (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        message.error('仅支持 JPG / PNG / WebP 格式的图片');
        return Upload.LIST_IGNORE;
      }
      if (file.size > MAX_SIZE) {
        message.error('图片大小不能超过 5MB');
        return Upload.LIST_IGNORE;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          setFile(file, dataUrl, img.width, img.height);
          setPreviewUrl(dataUrl);
          setInfo({
            width: img.width,
            height: img.height,
            sizeKB: Math.round(file.size / 1024)
          });
        };
        img.onerror = () => {
          message.error('图片加载失败，请重试');
        };
        img.src = dataUrl;
      };
      reader.onerror = () => {
        message.error('读取文件失败');
      };
      reader.readAsDataURL(file);
      return false;
    },
    [setFile]
  );

  const props: UploadProps = {
    name: 'file',
    multiple: false,
    showUploadList: false,
    beforeUpload: handleFile,
    accept: ACCEPTED_TYPES.join(',')
  };

  return (
    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: 'var(--spacing-md)',
        gap: 'var(--spacing-sm)'
      }}>
        <PictureOutlined style={{ color: 'var(--primary-color)' }} />
        <Typography.Title level={5} style={{ 
          margin: 0, 
          fontSize: '16px', 
          fontWeight: 600,
          color: 'var(--text-primary)'
        }}>
          图片上传
        </Typography.Title>
      </div>
      
      <Dragger 
        {...props}
        style={{
          borderRadius: 'var(--border-radius)',
          border: '2px dashed rgba(0, 0, 0, 0.1)',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          transition: 'all 0.3s ease'
        }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined style={{ fontSize: '24px', color: 'var(--primary-color)' }} />
        </p>
        <p className="ant-upload-text" style={{ color: 'var(--text-primary)' }}>
          点击或拖拽图片到此区域上传
        </p>
        <p className="ant-upload-hint" style={{ color: 'var(--text-secondary)' }}>
          支持 JPG / PNG / WebP，最大 5MB
        </p>
      </Dragger>
      
      {previewUrl && info && (
        <Space direction="vertical" style={{ 
          marginTop: 'var(--spacing-md)',
          padding: 'var(--spacing-md)',
          backgroundColor: 'rgba(52, 152, 219, 0.05)',
          borderRadius: 'var(--border-radius)'
        }}>
          <img
            src={previewUrl}
            alt="preview"
            style={{ 
              maxWidth: '100%', 
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Text type="secondary">
            尺寸：{info.width} × {info.height} px，大小：{info.sizeKB} KB
          </Text>
        </Space>
      )}
    </div>
  );
};

