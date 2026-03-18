import React, { useEffect } from 'react';
import { Select, Typography, Space, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { usePatternStore } from '../../stores/usePatternStore';
import styles from './PaletteSelector.module.css';

const { Text } = Typography;

export const PaletteSelector: React.FC = () => {
  const { 
    brandList, 
    currentSeries, 
    params, 
    selectBrand, 
    selectSeries, 
    fetchHierarchy 
  } = usePatternStore();

  // 获取当前选中的品牌
  const currentBrand = brandList.find(b => b.id === params.brandId);
  
  // 获取当前品牌下的所有系列
  const currentBrandSeries = currentBrand?.series || [];

  // 组件挂载时获取层级数据
  useEffect(() => {
    fetchHierarchy();
  }, []);

  // 品牌选项
  const brandOptions = brandList.map((brand) => ({
    value: brand.id,
    label: brand.name
  }));

  // 系列选项
  const seriesOptions = currentBrandSeries.map((series) => ({
    value: series.id,
    label: series.name
  }));

  return (
    <div className={styles.paletteSection}>
      <div className={styles.paletteHeader}>
        <div className={styles.paletteTitle}>色彩库选择</div>
        <div className={styles.paletteActions}>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            title="刷新色库"
            onClick={fetchHierarchy}
          />
        </div>
      </div>

      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {/* 第一级：品牌选择 */}
        <div>
          <Text type="secondary" style={{ fontSize: '12px' }}>品牌</Text>
          <Select
            value={params.brandId}
            options={brandOptions}
            style={{ width: '100%' }}
            onChange={(val) => selectBrand(val)}
            size="small"
            placeholder="选择品牌"
          />
        </div>

        {/* 第二级：系列选择 */}
        <div>
          <Text type="secondary" style={{ fontSize: '12px' }}>系列</Text>
          <Select
            value={params.seriesId}
            options={seriesOptions}
            style={{ width: '100%' }}
            onChange={(val) => selectSeries(val)}
            size="small"
            placeholder="选择系列"
            disabled={!params.brandId || seriesOptions.length === 0}
          />
        </div>

        {/* 颜色预览 */}
        <Text type="secondary">当前系列颜色预览：</Text>
        <div className={styles.paletteGrid}>
          {currentSeries?.colors.slice(0, 80).map((c) => (
            <div
              key={c.id}
              className={styles.paletteCell}
              style={{ backgroundColor: c.hex }}
              title={`${c.name || c.colorCode} (${c.hex})`}
            />
          ))}
        </div>
        {currentSeries ? (
          <div className={styles.colorInfo}>
            <Text>
              {currentBrand?.name} - {currentSeries.name} - {currentSeries.colors.length} 种颜色
            </Text>
          </div>
        ) : brandList.length === 0 ? (
          <div className={styles.colorInfo}>
            <Text type="secondary">加载中...</Text>
          </div>
        ) : null}
      </Space>
    </div>
  );
};
