import { saveAs } from 'file-saver';
import type { ImageState } from '../stores/useImageStore';
import type { PatternState } from '../stores/usePatternStore';

interface ColorUsageRow {
  key: string;
  name: string;
  hex: string;
  count: number;
}

export const savePatternAsPng = (patternState: PatternState, scale: number) => {
  const { params, patternCells, paletteList } = patternState;
  const palette = paletteList.find((p) => p.id === params.paletteId);
  if (!palette) return;

  const cellSize = 8 * scale;
  const canvas = document.createElement('canvas');
  canvas.width = params.width * cellSize;
  canvas.height = params.height * cellSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  patternCells.forEach((cell) => {
    const color = palette.colors.find((c) => c.id === cell.colorId);
    ctx.fillStyle = color?.hex ?? '#cccccc';
    ctx.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize, cellSize);
  });

  canvas.toBlob((blob) => {
    if (!blob) return;
    saveAs(blob, `bead-pattern-${params.width}x${params.height}@${scale}x.png`);
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

