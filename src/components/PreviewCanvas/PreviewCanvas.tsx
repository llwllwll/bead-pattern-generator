import React, { useEffect, useRef, useState } from 'react';
import { Card, Tabs, Slider, Switch, Space, Typography } from 'antd';
import * as fabric from 'fabric';
import { usePatternStore } from '../../stores/usePatternStore';

const { Text } = Typography;

export const PreviewCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const { params, patternCells, paletteList } = usePatternStore();
  const [scale, setScale] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [showIndex, setShowIndex] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<string>('');

  useEffect(() => {
    if (!canvasRef.current) return;
    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      selection: false
    });
    fabricRef.current = fabricCanvas;

    const handleMove = (opt: fabric.IEvent<MouseEvent>) => {
      const pointer = fabricCanvas.getPointer(opt.e);
      const cellSize = 10;
      const x = Math.floor(pointer.x / cellSize);
      const y = Math.floor(pointer.y / cellSize);
      if (x < 0 || y < 0 || x >= params.width || y >= params.height) {
        setHoverInfo('');
        return;
      }
      const cell = patternCells.find((c) => c.x === x && c.y === y);
      if (!cell) {
        setHoverInfo('');
        return;
      }
      const palette = paletteList.find((p) => p.id === params.paletteId);
      const color = palette?.colors.find((c) => c.id === cell.colorId);
      if (color) {
        setHoverInfo(`位置 (${x}, ${y}) - ${color.name} ${color.hex}`);
      }
    };

    fabricCanvas.on('mouse:move', handleMove);

    return () => {
      fabricCanvas.dispose();
    };
  }, [params.width, params.height, patternCells, paletteList, params.paletteId]);

  useEffect(() => {
    const fabricCanvas = fabricRef.current;
    if (!fabricCanvas) return;
    const cellSize = (scale / 100) * 8;
    fabricCanvas.setWidth(params.width * cellSize);
    fabricCanvas.setHeight(params.height * cellSize);
    fabricCanvas.clear();

    const palette = paletteList.find((p) => p.id === params.paletteId);

    patternCells.forEach((cell) => {
      const color = palette?.colors.find((c) => c.id === cell.colorId);
      const rect = new fabric.Rect({
        left: cell.x * cellSize,
        top: cell.y * cellSize,
        width: cellSize,
        height: cellSize,
        fill: color?.hex ?? '#cccccc',
        stroke: showGrid ? '#eeeeee' : undefined,
        strokeWidth: showGrid ? 0.5 : 0
      });
      fabricCanvas.add(rect);

      if (showIndex && color) {
        const text = new fabric.Text(String(palette?.colors.indexOf(color) + 1), {
          left: cell.x * cellSize + cellSize / 2,
          top: cell.y * cellSize + cellSize / 2,
          fontSize: cellSize * 0.4,
          originX: 'center',
          originY: 'center',
          fill: '#000'
        });
        fabricCanvas.add(text);
      }
    });

    fabricCanvas.renderAll();
  }, [patternCells, paletteList, params.paletteId, params.width, params.height, scale, showGrid, showIndex]);

  const items = [
    { key: 'color', label: '彩色视图' },
    { key: 'index', label: '编号视图' },
    { key: 'legend', label: '色标视图' }
  ];

  return (
    <Card size="small" title="实时预览">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space align="center">
          <Text>缩放</Text>
          <Slider
            style={{ flex: 1 }}
            min={25}
            max={400}
            value={scale}
            onChange={(v) => setScale(Number(v))}
          />
          <span>{scale}%</span>
        </Space>
        <Space>
          <Switch checked={showGrid} onChange={setShowGrid} size="small" />
          <Text type="secondary">显示网格</Text>
          <Switch checked={showIndex} onChange={setShowIndex} size="small" />
          <Text type="secondary">显示编号</Text>
        </Space>
        <Tabs
          defaultActiveKey="color"
          items={items.map((i) => ({
            key: i.key,
            label: i.label,
            children:
              i.key === 'legend' ? (
                <div style={{ maxHeight: 240, overflow: 'auto' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                      gap: 8
                    }}
                  >
                    {paletteList
                      .find((p) => p.id === params.paletteId)
                      ?.colors.map((c, idx) => (
                        <div
                          key={c.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                          }}
                        >
                          <div
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 4,
                              backgroundColor: c.hex,
                              border: '1px solid rgba(0,0,0,0.1)'
                            }}
                          />
                          <Text type="secondary">
                            #{idx + 1} {c.name}
                          </Text>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    width: '100%',
                    overflow: 'auto'
                  }}
                >
                  <canvas ref={canvasRef} />
                </div>
              )
          }))}
        />
        {hoverInfo && <Text type="secondary">{hoverInfo}</Text>}
      </Space>
    </Card>
  );
};

