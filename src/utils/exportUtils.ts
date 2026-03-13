import { saveAs } from 'file-saver';
import type { ImageState } from '../stores/useImageStore';
import type { PatternState } from '../stores/usePatternStore';

interface ColorUsageRow {
  key: string;
  name: string;
  hex: string;
  count: number;
}

export const savePatternAsPng = (patternState: PatternState, withIndex: boolean) => {
  const { params, patternCells, paletteList } = patternState;
  const palette = paletteList.find((p) => p.id === params.paletteId);
  if (!palette) return;

  const scale = 4; // 固定使用 4x 缩放以保证清晰度
  const cellSize = 8 * scale;
  const borderWidth = 40 * scale;
  const legendHeight = 120 * scale;
  
  // 计算画布尺寸（包含边框和色标区域）
  const canvasWidth = params.width * cellSize + borderWidth * 2;
  const canvasHeight = params.height * cellSize + borderWidth * 2 + legendHeight;
  
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 绘制背景
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // 绘制标题
  ctx.fillStyle = '#333333';
  ctx.font = `${24 * scale}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText('豆画', canvasWidth / 2, borderWidth / 2 + 10 * scale);
  
  // 绘制网格背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(borderWidth, borderWidth, params.width * cellSize, params.height * cellSize);
  
  // 绘制图案
  patternCells.forEach((cell) => {
    const color = palette.colors.find((c) => c.id === cell.colorId);
    ctx.fillStyle = color?.hex ?? '#cccccc';
    ctx.fillRect(
      borderWidth + cell.x * cellSize,
      borderWidth + cell.y * cellSize,
      cellSize,
      cellSize
    );
    
    // 绘制网格线
    ctx.strokeStyle = '#eeeeee';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      borderWidth + cell.x * cellSize,
      borderWidth + cell.y * cellSize,
      cellSize,
      cellSize
    );
    
    // 绘制编号
    if (withIndex) {
      const colorCode = color?.colorCode;
      if (colorCode) {
        // 根据背景色亮度决定文字颜色
        const r = parseInt((color.hex || '#ffffff').slice(1, 3), 16);
        const g = parseInt((color.hex || '#ffffff').slice(3, 5), 16);
        const b = parseInt((color.hex || '#ffffff').slice(5, 7), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        ctx.fillStyle = brightness > 128 ? '#000000' : '#ffffff';
        ctx.font = `${cellSize * 0.4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          colorCode,
          borderWidth + cell.x * cellSize + cellSize / 2,
          borderWidth + cell.y * cellSize + cellSize / 2
        );
      }
    }
  });
  
  // 绘制边缘线条
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 2;
  ctx.strokeRect(borderWidth, borderWidth, params.width * cellSize, params.height * cellSize);
  
  // 绘制坐标编号
  ctx.fillStyle = '#666666';
  ctx.font = `${12 * scale}px Arial`;
  ctx.textAlign = 'center';
  
  // 顶部坐标
  for (let x = 0; x < params.width; x++) {
    ctx.fillText(
      (x + 1).toString(),
      borderWidth + x * cellSize + cellSize / 2,
      borderWidth - 10 * scale
    );
  }
  
  // 左侧坐标
  ctx.textAlign = 'right';
  for (let y = 0; y < params.height; y++) {
    ctx.fillText(
      (y + 1).toString(),
      borderWidth - 10 * scale,
      borderWidth + y * cellSize + cellSize / 2 + 4 * scale
    );
  }
  
  // 右侧坐标
  ctx.textAlign = 'left';
  for (let y = 0; y < params.height; y++) {
    ctx.fillText(
      (y + 1).toString(),
      borderWidth + params.width * cellSize + 10 * scale,
      borderWidth + y * cellSize + cellSize / 2 + 4 * scale
    );
  }
  
  // 底部坐标
  ctx.textAlign = 'center';
  for (let x = 0; x < params.width; x++) {
    ctx.fillText(
      (x + 1).toString(),
      borderWidth + x * cellSize + cellSize / 2,
      borderWidth + params.height * cellSize + 25 * scale
    );
  }
  
  // 统计颜色使用情况
  const colorUsage = new Map<string, { color: any; count: number }>();
  patternCells.forEach((cell) => {
    const color = palette.colors.find((c) => c.id === cell.colorId);
    if (color) {
      const existing = colorUsage.get(color.id);
      if (existing) {
        existing.count++;
      } else {
        colorUsage.set(color.id, { color, count: 1 });
      }
    }
  });
  
  // 绘制色标区域
  const legendX = borderWidth;
  const legendY = borderWidth + params.height * cellSize + 40 * scale;
  const legendItemWidth = 150 * scale;
  const legendItemHeight = 40 * scale;
  const legendItemsPerRow = Math.floor((canvasWidth - borderWidth * 2) / legendItemWidth);
  
  Array.from(colorUsage.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([_, { color, count }], index) => {
      const row = Math.floor(index / legendItemsPerRow);
      const col = index % legendItemsPerRow;
      const x = legendX + col * legendItemWidth;
      const y = legendY + row * legendItemHeight;
      
      // 绘制颜色块
      ctx.fillStyle = color.hex;
      ctx.fillRect(x, y, 30 * scale, 30 * scale);
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, 30 * scale, 30 * scale);
      
      // 绘制颜色代码和数量
      ctx.fillStyle = '#333333';
      ctx.font = `${14 * scale}px Arial`;
      ctx.textAlign = 'left';
      ctx.fillText(
        `${color.colorCode || ''} (${count})`,
        x + 40 * scale,
        y + 20 * scale
      );
    });

  canvas.toBlob((blob) => {
    if (!blob) return;
    const suffix = withIndex ? 'with-index' : 'without-index';
    saveAs(blob, `bead-pattern-${params.width}x${params.height}-${suffix}.png`);
  });
};

export const exportColorsAsCsv = (rows: ColorUsageRow[]) => {
  const header = 'name,hex,count\n';
  const body = rows.map((r) => `${r.name},${r.hex},${r.count}`).join('\n');
  const content = header + body;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, 'bead-colors.csv');
};

export const saveProjectToFile = (imageState: ImageState, patternState: PatternState) => {
  const payload = {
    imageState,
    patternState,
    createdAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json'
  });
  saveAs(blob, 'bead-project.json');
};

export const saveProjectToLocalStorage = (data: {
  imageState: ImageState;
  patternState: PatternState;
  hasSeenTutorial: boolean;
}) => {
  try {
    localStorage.setItem('bead-project', JSON.stringify(data));
  } catch {
    // ignore
  }
};

export const loadProjectFromLocalStorage = ():
  | {
      imageState: ImageState;
      patternState: PatternState;
      hasSeenTutorial: boolean;
    }
  | undefined => {
  try {
    const raw = localStorage.getItem('bead-project');
    if (!raw) return undefined;
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

