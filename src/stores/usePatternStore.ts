import { create } from 'zustand';
import { paletteApi } from '../services/api';

export type DitheringMode = 'none' | 'floyd-steinberg' | 'atkinson';

export interface PaletteColor {
  id: string;
  colorCode: string;  // 字母+数字编号，如 A1, B12, H7
  name?: string;
  hex: string;
}

export interface Palette {
  id: string;
  name: string;
  code: string;
  colors: PaletteColor[];
}

export interface PatternParams {
  width: number;
  height: number;
  lockRatio: boolean;
  paletteId: string;
  beadSize: number;  // 拼豆颗粒尺寸：2.6, 5, 10
  edgeSmooth: number;
  colorTolerance: number;
  dithering: DitheringMode;
  transparencyMode: 'keep' | 'white' | 'custom';
  transparencyColor: string;
}

export interface PatternCell {
  x: number;
  y: number;
  colorId: string;
}

export interface PatternState {
  params: PatternParams;
  paletteList: Palette[];
  patternCells: PatternCell[];
  isProcessing: boolean;
  error?: string;

  setParams: (params: Partial<PatternParams>) => void;
  setPaletteList: (palettes: Palette[]) => void;
  setPatternCells: (cells: PatternCell[]) => void;
  setProcessing: (val: boolean) => void;
  setError: (msg?: string) => void;
  fetchPalettes: () => Promise<void>;
  updateColorInPalette: (paletteId: string, sourceColorId: string, targetColorId: string, isBatch?: boolean) => void;
}

// 默认色板（在从后端加载前使用）
const defaultPalettes: Palette[] = [
  {
    id: 'perler',
    name: 'Perler 标准色板',
    code: 'perler',
    colors: Array.from({ length: 50 }).map((_, i) => ({
      id: `perler-${i}`,
      colorCode: `${String.fromCharCode(65 + Math.floor(i / 10))}${(i % 10) + 1}`,
      name: `颜色 ${i + 1}`,
      hex: `#${((i * 997) % 0xffffff).toString(16).padStart(6, '0')}`
    }))
  }
];

export const usePatternStore = create<PatternState>((set, get) => ({
  params: {
    width: 50,
    height: 50,
    lockRatio: true,
    paletteId: 'perler',
    beadSize: 5,  // 默认5mm标准拼豆
    edgeSmooth: 30,
    colorTolerance: 20,
    dithering: 'none',
    transparencyMode: 'keep',
    transparencyColor: '#ffffff'
  },
  paletteList: defaultPalettes,
  patternCells: [],
  isProcessing: false,

  setParams: (params) =>
    set((state) => ({
      params: { ...state.params, ...params }
    })),

  setPaletteList: (paletteList) => set({ paletteList }),

  setPatternCells: (patternCells) => set({ patternCells }),

  setProcessing: (isProcessing) => set({ isProcessing }),

  setError: (error) => set({ error }),

  // 从后端获取色库列表
  fetchPalettes: async () => {
    try {
      const palettes = await paletteApi.getPublicPalettes();
      if (palettes && palettes.length > 0) {
        // 转换后端返回的数据格式，添加 colors 数组
        const transformedPalettes = await Promise.all(
          palettes.map(async (palette: any) => {
            try {
              // 获取每个色库的详细信息（包含颜色列表）
              const paletteDetail = await paletteApi.getPublicPalette(palette.id);
              return {
                id: palette.id,
                name: palette.name,
                code: palette.code,
                colors: (paletteDetail.colors || []).map((color: any) => ({
                  id: color.id,
                  colorCode: color.color_code,
                  name: color.name,
                  hex: color.hex
                }))
              };
            } catch (error) {
              console.error(`Failed to fetch palette details for ${palette.id}:`, error);
              // 如果获取详细信息失败，返回基本信息
              return {
                id: palette.id,
                name: palette.name,
                code: palette.code,
                colors: []
              };
            }
          })
        );
        
        set({ paletteList: transformedPalettes });
        // 如果当前选中的色板不在列表中，选择第一个
        const currentId = get().params.paletteId;
        const exists = transformedPalettes.some((p: Palette) => p.id === currentId);
        if (!exists && transformedPalettes.length > 0) {
          set((state) => ({
            params: { ...state.params, paletteId: transformedPalettes[0].id }
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch palettes:', error);
    }
  },

  // 批量替换颜色（将使用 sourceColorId 的单元格替换为 targetColorId）
  updateColorInPalette: (paletteId: string, sourceColorId: string, targetColorId: string, isBatch = false) =>
    set((state) => {
      // 如果是批量替换，更新所有使用该颜色的单元格
      if (isBatch) {
        return {
          patternCells: state.patternCells.map((cell) =>
            cell.colorId === sourceColorId
              ? { ...cell, colorId: targetColorId }
              : cell
          )
        };
      }
      return state;
    })
}));
