import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Card, Tabs, Switch, Space, Typography, Select } from 'antd';
import { usePatternStore } from '../../stores/usePatternStore';

const { Text } = Typography;

// 防抖函数
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export const PreviewCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const { params, patternCells, paletteList, updateColorInPalette } = usePatternStore();
  const [scale, setScale] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [showIndex, setShowIndex] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<string>('');
  const [activeTab, setActiveTab] = useState('color');
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  // 获取当前色板
  const currentPalette = useMemo(() => {
    return paletteList.find((p) => p.id === params.paletteId);
  }, [paletteList, params.paletteId]);

  // 创建颜色映射表，提高查找效率
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (currentPalette) {
      currentPalette.colors.forEach((color) => {
        map.set(color.id, color.hex);
      });
    }
    return map;
  }, [currentPalette]);

  // 获取颜色的编号（字母+数字格式）
  const getColorCode = useCallback((colorId: string): string => {
    const color = currentPalette?.colors.find((c) => c.id === colorId);
    return color?.colorCode || '';
  }, [currentPalette]);

  // 渲染函数 - 使用原生 Canvas API 替代 Fabric.js 以提高性能
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    setIsRendering(true);

    // 使用 requestAnimationFrame 确保流畅渲染
    requestAnimationFrame(() => {
      const cellSize = (scale / 100) * 8;
      const containerWidth = 400;
      const containerHeight = 300;

      // 计算内容大小
      const contentWidth = params.width * cellSize;
      const contentHeight = params.height * cellSize;

      // 计算缩放比例以适应容器
      const scaleX = containerWidth / contentWidth;
      const scaleY = containerHeight / contentHeight;
      const fitScale = Math.min(scaleX, scaleY);

      const actualCellSize = cellSize * fitScale;

      // 设置 canvas 大小
      canvas.width = containerWidth;
      canvas.height = containerHeight;

      // 清空画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 计算居中偏移
      const offsetX = (containerWidth - contentWidth * fitScale) / 2;
      const offsetY = (containerHeight - contentHeight * fitScale) / 2;

      // 性能优化：批量绘制
      ctx.save();
      ctx.translate(offsetX, offsetY);

      // 绘制所有单元格
      patternCells.forEach((cell) => {
        const x = cell.x * actualCellSize;
        const y = cell.y * actualCellSize;
        const colorHex = colorMap.get(cell.colorId) ?? '#cccccc';

        // 填充颜色
        ctx.fillStyle = colorHex;
        ctx.fillRect(x, y, actualCellSize, actualCellSize);

        // 绘制网格
        if (showGrid) {
          ctx.strokeStyle = '#eeeeee';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, actualCellSize, actualCellSize);
        }
      });

      // 绘制编号（字母+数字格式，如 A1, B12, H7）
      if ((showIndex || activeTab === 'index') && fitScale > 0.3) {
        ctx.font = `${actualCellSize * 0.35}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        patternCells.forEach((cell) => {
          const colorCode = getColorCode(cell.colorId);
          if (colorCode) {
            const x = cell.x * actualCellSize + actualCellSize / 2;
            const y = cell.y * actualCellSize + actualCellSize / 2;
            const colorHex = colorMap.get(cell.colorId) ?? '#cccccc';

            // 根据背景色亮度决定文字颜色
            const r = parseInt(colorHex.slice(1, 3), 16);
            const g = parseInt(colorHex.slice(3, 5), 16);
            const b = parseInt(colorHex.slice(5, 7), 16);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            ctx.fillStyle = brightness > 128 ? '#000' : '#fff';

            ctx.fillText(colorCode, x, y);
          }
        });
      }

      ctx.restore();
      setIsRendering(false);
    });
  }, [patternCells, colorMap, params.width, params.height, scale, showGrid, showIndex, activeTab, getColorCode]);

  // 防抖渲染
  const debouncedRender = useMemo(
    () => debounce(renderCanvas, 100),
    [renderCanvas]
  );

  // 初始化 Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctxRef.current = ctx;
    }
  }, []);

  // 监听变化并渲染
  useEffect(() => {
    if (patternCells.length > 0) {
      debouncedRender();
    }
  }, [patternCells, scale, showGrid, showIndex, activeTab, debouncedRender]);

  // 处理鼠标移动显示信息
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const cellSize = (scale / 100) * 8;
      const contentWidth = params.width * cellSize;
      const contentHeight = params.height * cellSize;
      const containerWidth = 400;
      const containerHeight = 300;
      const scaleX = containerWidth / contentWidth;
      const scaleY = containerHeight / contentHeight;
      const fitScale = Math.min(scaleX, scaleY, 1);
      const actualCellSize = cellSize * fitScale;
      const offsetX = (containerWidth - contentWidth * fitScale) / 2;
      const offsetY = (containerHeight - contentHeight * fitScale) / 2;

      const cellX = Math.floor((x - offsetX) / actualCellSize);
      const cellY = Math.floor((y - offsetY) / actualCellSize);

      if (
        cellX < 0 ||
        cellY < 0 ||
        cellX >= params.width ||
        cellY >= params.height
      ) {
        setHoverInfo('');
        return;
      }

      const cell = patternCells.find((c) => c.x === cellX && c.y === cellY);
      if (!cell) {
        setHoverInfo('');
        return;
      }

      const color = currentPalette?.colors.find((c) => c.id === cell.colorId);
      if (color) {
        setHoverInfo(
          `位置 (${cellX + 1}, ${cellY + 1}) - ${color.colorCode || ''} ${color.name || ''} ${color.hex}`
        );
      }
    },
    [patternCells, params.width, params.height, scale, currentPalette]
  );

  const items = [
    { key: 'color', label: '彩色视图' },
    { key: 'index', label: '编号视图' },
  ];

  // 只在有图纸数据时显示色标
  const showLegend = patternCells.length > 0;

  // 获取所有可用颜色选项（用于批量替换）
  const colorOptions = useMemo(() => {
    return currentPalette?.colors.map((c) => ({
      value: c.id,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            width: '20px', 
            height: '20px', 
            borderRadius: '4px', 
            backgroundColor: c.hex,
            border: '1px solid rgba(0,0,0,0.1)'
          }} />
          <span>{c.colorCode || ''} {c.name || ''} ({c.hex})</span>
        </div>
      ),
      colorCode: c.colorCode,
    })) || [];
  }, [currentPalette]);

  return (
    <Card size="small" title="实时预览">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space align="center">
          <Text>缩放</Text>
          <button
            onClick={() => setScale(Math.max(25, scale - 25))}
            disabled={isRendering}
            style={{
              width: 32,
              height: 32,
              borderRadius: 4,
              border: '1px solid #d9d9d9',
              backgroundColor: 'white',
              cursor: isRendering ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isRendering ? 0.5 : 1,
            }}
          >
            -
          </button>
          <span style={{ minWidth: '60px', textAlign: 'center' }}>
            {scale}%
          </span>
          <button
            onClick={() => setScale(Math.min(400, scale + 25))}
            disabled={isRendering}
            style={{
              width: 32,
              height: 32,
              borderRadius: 4,
              border: '1px solid #d9d9d9',
              backgroundColor: 'white',
              cursor: isRendering ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isRendering ? 0.5 : 1,
            }}
          >
            +
          </button>
        </Space>
        <Space>
          <Switch checked={showGrid} onChange={setShowGrid} size="small" />
          <Text type="secondary">显示网格</Text>
          <Switch checked={showIndex} onChange={setShowIndex} size="small" />
          <Text type="secondary">显示编号</Text>
        </Space>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            if (key === 'index') {
              setShowIndex(true);
            }
          }}
          items={items.map((i) => ({
            key: i.key,
            label: i.label,
            children: (
              <div
                style={{
                  width: '100%',
                  height: '300px',
                  overflow: 'auto',
                  border: '1px solid #f0f0f0',
                  borderRadius: '4px',
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                <canvas
                  ref={canvasRef}
                  onMouseMove={handleMouseMove}
                  style={{ display: 'block' }}
                />
                {isRendering && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      background: 'rgba(255,255,255,0.9)',
                      padding: '8px 16px',
                      borderRadius: 4,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                  >
                    <Text type="secondary">渲染中...</Text>
                  </div>
                )}
              </div>
            ),
          }))}
        />

        {/* 色标显示 - 只在有图纸时显示 */}
        {showLegend && (
          <div style={{ marginTop: 16 }}>
            <Text strong>色标</Text>
            <div style={{ maxHeight: 120, overflow: 'auto', marginTop: 8 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: 8,
                }}
              >
                {currentPalette?.colors.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: 8,
                      borderRadius: 4,
                      cursor: 'pointer',
                      backgroundColor:
                        selectedColorId === c.id ? '#f0f0f0' : 'transparent',
                    }}
                    onClick={() => setSelectedColorId(c.id)}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        backgroundColor: c.hex,
                        border: '1px solid rgba(0,0,0,0.1)',
                      }}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {c.colorCode || ''} {c.name || ''}
                    </Text>
                  </div>
                ))}
              </div>
            </div>

            {/* 颜色替换选择器 - 在下方单独显示 */}
            {selectedColorId && (
              <div
                style={{
                  marginTop: 16,
                  padding: 16,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <Text>批量替换颜色:</Text>
                {(() => {
                  const color = currentPalette?.colors.find(
                    (c) => c.id === selectedColorId
                  );
                  return color ? (
                    <>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 4,
                          backgroundColor: color.hex,
                          border: '1px solid rgba(0,0,0,0.2)',
                        }}
                      />
                      <Text type="secondary">
                        {color.colorCode || ''} {color.name || ''}
                      </Text>
                      <Text>替换为:</Text>
                      <Select
                        style={{ width: 180 }}
                        placeholder="选择目标颜色"
                        options={colorOptions.filter((opt) => opt.value !== selectedColorId)}
                        onChange={(targetColorId) => {
                          if (targetColorId) {
                            // 批量替换所有使用该颜色的单元格
                            updateColorInPalette(params.paletteId, selectedColorId, targetColorId, true);
                            setSelectedColorId(null);
                          }
                        }}
                        size="small"
                      />
                      <button
                        onClick={() => setSelectedColorId(null)}
                        style={{
                          marginLeft: 'auto',
                          padding: '4px 12px',
                          border: '1px solid #d9d9d9',
                          borderRadius: 4,
                          backgroundColor: 'white',
                          cursor: 'pointer',
                        }}
                      >
                        取消
                      </button>
                    </>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        )}

        {hoverInfo && <Text type="secondary">{hoverInfo}</Text>}
      </Space>
    </Card>
  );
};
