import { create } from 'zustand';

export type DitheringMode = 'none' | 'floyd-steinberg' | 'atkinson';

export interface PaletteColor {
  id: string;
  name: string;
  hex: string;
}

export interface Palette {
  id: string;
  name: string;
  colors: PaletteColor[];
}

export interface PatternParams {
  width: number;
  height: number;
  lockRatio: boolean;
  paletteId: string;
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
}

const createDummyPalette = (id: string, name: string, count: number): Palette => {
  const colors: PaletteColor[] = Array.from({ length: count }).map((_, i) => ({
    id: `${id}-${i}`,
    name: `${name} ${i + 1}`,
    hex: `#${((i * 997) % 0xffffff).toString(16).padStart(6, '0')}`
  }));
  return { id, name, colors };
};

const defaultPalettes: Palette[] = [
  createDummyPalette('perler', 'Perler 标准色板', 100),
  createDummyPalette('hama', 'Hama 标准色板', 80),
  createDummyPalette('artkal', 'Artkal 标准色板', 120),
  createDummyPalette('mini', '迷你拼豆色板', 50)
];

export const usePatternStore = create<PatternState>((set) => ({
  params: {
    width: 50,
    height: 50,
    lockRatio: true,
    paletteId: 'perler',
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

  setError: (error) => set({ error })
}));

