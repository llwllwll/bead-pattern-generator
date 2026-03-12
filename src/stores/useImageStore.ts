import { create } from 'zustand';

export interface ImageAdjustments {
  brightness: number; // -100 ~ 100
  contrast: number; // -100 ~ 100
  saturation: number; // -100 ~ 100
}

export interface ImageDimensions {
  width: number;
  height: number;
  lockRatio: boolean;
}

export interface ImageState {
  file?: File;
  dataUrl?: string;
  originalWidth?: number;
  originalHeight?: number;
  editedDataUrl?: string;
  adjustments: ImageAdjustments;
  dimensions?: ImageDimensions;

  setFile: (file: File, dataUrl: string, width: number, height: number) => void;
  setEditedDataUrl: (dataUrl?: string) => void;
  setAdjustments: (adjustments: Partial<ImageAdjustments>) => void;
  setDimensions: (dims: Partial<ImageDimensions>) => void;
  resetAdjustments: () => void;
}

export const useImageStore = create<ImageState>((set) => ({
  adjustments: {
    brightness: 0,
    contrast: 0,
    saturation: 0
  },

  setFile: (file, dataUrl, width, height) =>
    set({
      file,
      dataUrl,
      originalWidth: width,
      originalHeight: height,
      editedDataUrl: dataUrl,
      dimensions: {
        width,
        height,
        lockRatio: true
      }
    }),

  setEditedDataUrl: (editedDataUrl) => set({ editedDataUrl }),

  setAdjustments: (adjustments) =>
    set((state) => ({
      adjustments: { ...state.adjustments, ...adjustments }
    })),

  setDimensions: (dims) =>
    set((state) => ({
      dimensions: { ...(state.dimensions ?? { width: 0, height: 0, lockRatio: true }), ...dims }
    })),

  resetAdjustments: () =>
    set({
      adjustments: {
        brightness: 0,
        contrast: 0,
        saturation: 0
      }
    })
}));

