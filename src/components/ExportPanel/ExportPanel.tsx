import React, { useEffect, useMemo } from 'react';
import { Card, Descriptions, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { usePatternStore } from '../../stores/usePatternStore';
import { savePatternAsPng, exportColorsAsCsv, saveProjectToFile } from '../../utils/exportUtils';
import { useImageStore } from '../../stores/useImageStore';

const { Text } = Typography;

interface ColorUsageRow {
  key: string;
  name: string;
  hex: string;
  count: number;
}

export const ExportPanel: React.FC = () => {
  const patternState = usePatternStore();
  const imageState = useImageStore();

  const { params, patternCells, paletteList } = patternState;

  const stats = useMemo(() => {
    const totalCells = params.width * params.height;
    const palette = paletteList.find((p) => p.id === params.paletteId);
    const map = new Map<string, ColorUsageRow>();
    patternCells.forEach((cell) => {
      const color = palette?.colors.find((c) => c.id === cell.colorId);
      if (!color) return;
      const exist = map.get(color.id);
      if (exist) {
        exist.count += 1;
      } else {
        map.set(color.id, {
          key: color.id,
          name: color.name,
          hex: color.hex,
          count: 1
        });
      }
    });
    const rows = Array.from(map.values()).sort((a, b) => b.count - a.count);
    const usedColors = rows.length;
    const beadSizeMm = 5;
    const widthMm = params.width * beadSizeMm;
    const heightMm = params.height * beadSizeMm;
    return {
      totalCells,
      usedColors,
      widthCm: (widthMm / 10).toFixed(1),
      heightCm: (heightMm / 10).toFixed(1),
      rows
    };
  }, [params, patternCells, paletteList]);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<string>;
      const key = custom.detail;
      if (key.startsWith('export-png')) {
        const scale = key === 'export-png-4x' ? 4 : key === 'export-png-2x' ? 2 : 1;
        savePatternAsPng(patternState, scale);
      } else if (key === 'export-csv') {
        exportColorsAsCsv(stats.rows);
      } else if (key === 'export-json') {
        saveProjectToFile(imageState, patternState);
      }
    };
    window.addEventListener('bead-export', handler as EventListener);
    return () => window.removeEventListener('bead-export', handler as EventListener);
  }, [patternState, stats.rows, imageState]);

  const columns: ColumnsType<ColorUsageRow> = [
    {
      title: '颜色',
      dataIndex: 'hex',
      key: 'hex',
      render: (hex: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              backgroundColor: hex,
              border: '1px solid rgba(0,0,0,0.1)'
            }}
          />
          <Text type="secondary">{hex}</Text>
        </div>
      )
    },
    {
      title: '名称/编号',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '数量',
      dataIndex: 'count',
      key: 'count',
      sorter: (a, b) => a.count - b.count
    }
  ];

  return (
    <Card size="small" title="图纸信息与材料清单">
      <Descriptions column={1} size="small">
        <Descriptions.Item label="图纸尺寸">
          {params.width} × {params.height} 颗粒
        </Descriptions.Item>
        <Descriptions.Item label="实际物理尺寸">
          约 {stats.widthCm} × {stats.heightCm} cm (5mm 颗粒)
        </Descriptions.Item>
        <Descriptions.Item label="使用颜色数量">{stats.usedColors}</Descriptions.Item>
        <Descriptions.Item label="总颗粒数">{stats.totalCells}</Descriptions.Item>
      </Descriptions>
      <Table<ColorUsageRow>
        size="small"
        style={{ marginTop: 8 }}
        dataSource={stats.rows}
        columns={columns}
        pagination={{ pageSize: 8 }}
      />
    </Card>
  );
};

