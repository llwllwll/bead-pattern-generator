import React from 'react';
import { Select, Typography, Space, Button } from 'antd';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { usePatternStore } from '../../stores/usePatternStore';
import styles from './PaletteSelector.module.css';

const { Text } = Typography;

export const PaletteSelector: React.FC = () => {
  const { paletteList, params, setParams } = usePatternStore();

  const options = paletteList.map((p) => ({
    value: p.id,
    label: p.name
  }));

  const currentPalette = paletteList.find((p) => p.id === params.paletteId) ?? paletteList[0];

  return (
    <div className={styles.paletteSection}>
      <div className={styles.paletteHeader}>
        <div className={styles.paletteTitle}>色彩库选择</div>
        <div className={styles.paletteActions}>
          <Button 
            size="small" 
            icon={<ReloadOutlined />}
            title="刷新色板"
          />
          <Button 
            size="small" 
            icon={<PlusOutlined />}
            title="添加色板"
          />
        </div>
      </div>
      
      <Space direction="vertical" style={{ width: '100%' }}>
        <Select
          value={params.paletteId}
          options={options}
          style={{ width: '100%' }}
          onChange={(val) => setParams({ paletteId: val })}
          size="small"
        />
        <Text type="secondary">当前色板颜色预览：</Text>
        <div className={styles.paletteGrid}>
          {currentPalette?.colors.slice(0, 80).map((c) => (
            <div
              key={c.id}
              className={styles.paletteCell}
              style={{ backgroundColor: c.hex }}
              title={`${c.name} (${c.hex})`}
            />
          ))}
        </div>
        {currentPalette && (
          <div className={styles.colorInfo}>
            <Text>{currentPalette.name} - {currentPalette.colors.length} 种颜色</Text>
          </div>
        )}
      </Space>
    </div>
  );
};

