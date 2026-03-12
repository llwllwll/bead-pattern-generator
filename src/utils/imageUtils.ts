import { debounce } from 'lodash-es';
import type { ImageAdjustments } from '../stores/useImageStore';
import type { PatternParams, PatternCell, Palette } from '../stores/usePatternStore';

export const applyAdjustmentsToImage = async (
  srcDataUrl: string,
  adjustments: ImageAdjustments
): Promise<string> => {
  const img = new Image();
  img.src = srcDataUrl;
  await img.decode();

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return srcDataUrl;

  ctx.drawImage(img, 0, 0);
  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const b = adjustments.brightness / 100;
  const c = adjustments.contrast / 100;
  const s = adjustments.saturation / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let bch = data[i + 2];

    // 亮度
    r += 255 * b;
    g += 255 * b;
    bch += 255 * b;

    // 对比度
    r = (r - 128) * (1 + c) + 128;
    g = (g - 128) * (1 + c) + 128;
    bch = (bch - 128) * (1 + c) + 128;

    // 饱和度
    const gray = 0.3 * r + 0.59 * g + 0.11 * bch;
    r = r + (r - gray) * s;
    g = g + (g - gray) * s;
    bch = bch + (bch - gray) * s;

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, bch));
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

const getNearestPaletteColorId = (r: number, g: number, b: number, palette: Palette): string => {
  let bestId = palette.colors[0]?.id ?? '';
  let bestDist = Number.MAX_VALUE;
  palette.colors.forEach((c) => {
    const hex = c.hex.replace('#', '');
    const pr = parseInt(hex.slice(0, 2), 16);
    const pg = parseInt(hex.slice(2, 4), 16);
    const pb = parseInt(hex.slice(4, 6), 16);
    const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      bestId = c.id;
    }
  });
  return bestId;
};

export const generatePatternFromImage = async (
  srcDataUrl: string,
  params: PatternParams,
  palette: Palette
): Promise<PatternCell[]> => {
  const img = new Image();
  img.src = srcDataUrl;
  await img.decode();

  const canvas = document.createElement('canvas');
  canvas.width = params.width;
  canvas.height = params.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  ctx.drawImage(img, 0, 0, params.width, params.height);
  const imageData = ctx.getImageData(0, 0, params.width, params.height);
  const data = imageData.data;

  const cells: PatternCell[] = [];
  for (let y = 0; y < params.height; y++) {
    for (let x = 0; x < params.width; x++) {
      const idx = (y * params.width + x) * 4;
      let r = data[idx];
      let g = data[idx + 1];
      let b = data[idx + 2];
      const alpha = data[idx + 3];

      if (alpha === 0) {
        if (params.transparencyMode === 'white') {
          r = 255;
          g = 255;
          b = 255;
        } else if (params.transparencyMode === 'custom') {
          const hex = params.transparencyColor.replace('#', '');
          r = parseInt(hex.slice(0, 2), 16);
          g = parseInt(hex.slice(2, 4), 16);
          b = parseInt(hex.slice(4, 6), 16);
        }
      }

      const colorId = getNearestPaletteColorId(r, g, b, palette);
      cells.push({ x, y, colorId });
    }
  }
  return cells;
};

export const debounceUpdate = debounce((fn: () => void) => fn(), 300);

