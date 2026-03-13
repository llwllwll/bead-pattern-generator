import { saveAs } from 'file-saver';
import type { PatternState } from '../stores/usePatternStore';

interface ColorUsage {
  color: {
    id: string;
    colorCode: string;
    name?: string;
    hex: string;
  };
  count: number;
}

/**
 * 生成拼豆图纸图片
 * 参考效果：顶部和底部有行列编号，图案区域带网格，底部显示颜色列表
 */
export const generatePatternImage = (
  patternState: PatternState,
  withIndex: boolean,
  title?: string
): void => {
  const { params, patternCells, paletteList } = patternState;
  const palette = paletteList.find((p) => p.id === params.paletteId);
  if (!palette || patternCells.length === 0) return;

  // 配置参数
  const scale = 3; // 缩放倍数
  const cellSize = 12 * scale; // 单元格大小
  const numberSize = 20 * scale; // 编号区域大小
  const gap = 8 * scale; // 间距

  // 计算画布尺寸
  const patternWidth = params.width * cellSize;
  const patternHeight = params.height * cellSize;

  // 统计颜色使用情况
  const colorUsageMap = new Map<string, ColorUsage>();
  patternCells.forEach((cell) => {
    const color = palette.colors.find((c) => c.id === cell.colorId);
    if (color) {
      const existing = colorUsageMap.get(color.id);
      if (existing) {
        existing.count++;
      } else {
        colorUsageMap.set(color.id, { color, count: 1 });
      }
    }
  });

  const colorUsageList = Array.from(colorUsageMap.values()).sort(
    (a, b) => b.count - a.count
  );

  // 计算颜色列表区域高度（每行4个颜色）
  const colorsPerRow = 4;
  const colorItemHeight = 40 * scale;
  const colorRows = Math.ceil(colorUsageList.length / colorsPerRow);
  const legendHeight = colorRows * colorItemHeight + gap * 2;

  // 画布总尺寸
  const canvasWidth = Math.max(
    patternWidth + numberSize * 2,
    600 * scale // 最小宽度
  );
  const canvasHeight =
    numberSize + // 顶部编号
    patternHeight + // 图案区域
    numberSize + // 底部编号
    gap +
    legendHeight; // 颜色列表

  // 创建画布
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 填充白色背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 计算居中偏移
  const offsetX = (canvasWidth - patternWidth) / 2;
  const patternTop = numberSize;

  // 绘制顶部列编号
  ctx.fillStyle = '#666666';
  ctx.font = `${10 * scale}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let x = 0; x < params.width; x++) {
    // 只显示部分编号，避免太密集
    if (params.width <= 30 || x % 2 === 0 || x === params.width - 1) {
      ctx.fillText(
        (x + 1).toString(),
        offsetX + x * cellSize + cellSize / 2,
        patternTop - numberSize / 2
      );
    }
  }

  // 绘制左侧行编号
  ctx.textAlign = 'center';
  for (let y = 0; y < params.height; y++) {
    // 只显示部分编号
    if (params.height <= 30 || y % 2 === 0 || y === params.height - 1) {
      ctx.fillText(
        (y + 1).toString(),
        offsetX - numberSize / 2,
        patternTop + y * cellSize + cellSize / 2
      );
    }
  }

  // 绘制右侧行编号
  for (let y = 0; y < params.height; y++) {
    if (params.height <= 30 || y % 2 === 0 || y === params.height - 1) {
      ctx.fillText(
        (y + 1).toString(),
        offsetX + patternWidth + numberSize / 2,
        patternTop + y * cellSize + cellSize / 2
      );
    }
  }

  // 绘制底部列编号
  for (let x = 0; x < params.width; x++) {
    if (params.width <= 30 || x % 2 === 0 || x === params.width - 1) {
      ctx.fillText(
        (x + 1).toString(),
        offsetX + x * cellSize + cellSize / 2,
        patternTop + patternHeight + numberSize / 2
      );
    }
  }

  // 绘制图案背景（浅灰色）
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(offsetX, patternTop, patternWidth, patternHeight);

  // 绘制每个单元格
  patternCells.forEach((cell) => {
    const color = palette.colors.find((c) => c.id === cell.colorId);
    if (!color) return;

    const x = offsetX + cell.x * cellSize;
    const y = patternTop + cell.y * cellSize;

    // 填充颜色
    ctx.fillStyle = color.hex;
    ctx.fillRect(x, y, cellSize, cellSize);

    // 绘制网格线
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, cellSize, cellSize);

    // 绘制编号（如果需要）
    if (withIndex && color.colorCode) {
      // 根据背景色亮度决定文字颜色
      const r = parseInt(color.hex.slice(1, 3), 16);
      const g = parseInt(color.hex.slice(3, 5), 16);
      const b = parseInt(color.hex.slice(5, 7), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      ctx.fillStyle = brightness > 128 ? '#000000' : '#ffffff';
      ctx.font = `${cellSize * 0.35}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(color.colorCode, x + cellSize / 2, y + cellSize / 2);
    }
  });

  // 绘制图案边框
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 2;
  ctx.strokeRect(offsetX, patternTop, patternWidth, patternHeight);

  // 绘制颜色列表
  const legendTop = patternTop + patternHeight + numberSize + gap;
  const colorItemWidth = (canvasWidth - gap * 2) / colorsPerRow;

  colorUsageList.forEach((usage, index) => {
    const row = Math.floor(index / colorsPerRow);
    const col = index % colorsPerRow;
    const x = gap + col * colorItemWidth;
    const y = legendTop + row * colorItemHeight;

    // 绘制颜色方块
    ctx.fillStyle = usage.color.hex;
    ctx.fillRect(x, y, 28 * scale, 28 * scale);

    // 绘制颜色方块边框
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, 28 * scale, 28 * scale);

    // 绘制颜色代码和数量
    ctx.fillStyle = '#333333';
    ctx.font = `${12 * scale}px Arial`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `${usage.color.colorCode} (${usage.count})`,
      x + 32 * scale,
      y + 14 * scale
    );
  });

  // 导出图片
  canvas.toBlob((blob) => {
    if (!blob) return;
    const suffix = withIndex ? 'with-index' : 'without-index';
    const fileTitle = title || 'bead-pattern';
    saveAs(blob, `${fileTitle}-${params.width}x${params.height}-${suffix}.png`);
  });
};

/**
 * 导出带编号的图片
 */
export const exportPatternWithIndex = (patternState: PatternState, title?: string): void => {
  generatePatternImage(patternState, true, title);
};

/**
 * 导出不带编号的图片
 */
export const exportPatternWithoutIndex = (patternState: PatternState, title?: string): void => {
  generatePatternImage(patternState, false, title);
};
