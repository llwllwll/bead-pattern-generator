import { create } from 'zustand';
import { paletteApi, type Color, type HierarchicalBrand, type HierarchicalSeries } from '../services/api';

export type DitheringMode = 'none' | 'floyd-steinberg' | 'atkinson';

export interface PaletteColor {
  id: string;
  colorCode: string;  // 字母+数字编号，如 A1, B12, H7
  name?: string;
  hex: string;
}

export interface Series {
  id: string;
  name: string;
  code: string;
  brandId: string;
  brandName: string;
  colors: PaletteColor[];
  isDefault: boolean;
}

export interface Brand {
  id: string;
  name: string;
  code: string;
  series: Series[];
}

export interface PatternParams {
  width: number;
  height: number;
  lockRatio: boolean;
  brandId: string;
  seriesId: string;
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
  brandList: Brand[];
  seriesList: Series[];
  currentSeries: Series | null;
  patternCells: PatternCell[];
  isProcessing: boolean;
  error?: string;

  setParams: (params: Partial<PatternParams>) => void;
  setBrandList: (brands: Brand[]) => void;
  setSeriesList: (series: Series[]) => void;
  setCurrentSeries: (series: Series | null) => void;
  setPatternCells: (cells: PatternCell[]) => void;
  setProcessing: (val: boolean) => void;
  setError: (msg?: string) => void;
  fetchHierarchy: () => Promise<void>;
  selectBrand: (brandId: string) => void;
  selectSeries: (seriesId: string) => void;
  updateColorInPattern: (paletteId: string, sourceColorId: string, targetColorId: string, isBatch?: boolean) => void;
  fetchSeriesColors: (seriesId: string) => Promise<void>;
}

export const usePatternStore = create<PatternState>((set, get) => ({
  params: {
    width: 50,
    height: 50,
    lockRatio: true,
    brandId: '',
    seriesId: '',
    beadSize: 5,  // 默认5mm标准拼豆
    edgeSmooth: 30,
    colorTolerance: 20,
    dithering: 'none',
    transparencyMode: 'keep',
    transparencyColor: '#ffffff'
  },
  brandList: [],
  seriesList: [],
  currentSeries: null,
  patternCells: [],
  isProcessing: false,

  setParams: (params) =>
    set((state) => ({
      params: { ...state.params, ...params }
    })),

  setBrandList: (brandList) => set({ brandList }),
  
  setSeriesList: (seriesList) => set({ seriesList }),
  
  setCurrentSeries: (currentSeries) => set({ currentSeries }),

  setPatternCells: (patternCells) => set({ patternCells }),

  setProcessing: (isProcessing) => set({ isProcessing }),

  setError: (error) => set({ error }),

  // 从后端获取品牌和系列层级数据（不包含颜色，快速加载）
  fetchHierarchy: async () => {
    try {
      const hierarchy: HierarchicalBrand[] = await paletteApi.getPublicHierarchy();
      
      if (hierarchy && hierarchy.length > 0) {
        // 转换数据格式，不加载颜色
        const brands: Brand[] = hierarchy.map(brand => ({
          id: brand.id,
          name: brand.name,
          code: brand.code,
          series: brand.series.map(series => ({
            id: series.id,
            name: series.name,
            code: series.code,
            brandId: brand.id,
            brandName: brand.name,
            isDefault: series.is_default,
            colors: []
          }))
        }));

        // 提取所有系列
        const allSeries: Series[] = brands.flatMap(b => b.series);
        
        set({ 
          brandList: brands,
          seriesList: allSeries
        });

        // 如果当前选中的品牌不在列表中，选择第一个
        const currentBrandId = get().params.brandId;
        const currentSeriesId = get().params.seriesId;
        
        const currentBrand = brands.find(b => b.id === currentBrandId);
        const currentSeries = allSeries.find(s => s.id === currentSeriesId);
        
        if (!currentBrand && brands.length > 0) {
          // 选择第一个品牌
          const firstBrand = brands[0];
          const firstSeries = firstBrand.series[0] || allSeries[0];
          
          set((state) => ({
            params: { 
              ...state.params, 
              brandId: firstBrand.id,
              seriesId: firstSeries?.id || ''
            },
            currentSeries: firstSeries || null
          }));
          
          // 加载第一个系列的颜色
          if (firstSeries) {
            get().fetchSeriesColors(firstSeries.id);
          }
        } else if (!currentSeries && allSeries.length > 0) {
          // 保持品牌，选择该品牌的第一个系列
          const brandSeries = currentBrand?.series || allSeries;
          const defaultSeriesInBrand = brandSeries.find(s => s.isDefault) || brandSeries[0];
          
          set((state) => ({
            params: { 
              ...state.params, 
              seriesId: defaultSeriesInBrand?.id || ''
            },
            currentSeries: defaultSeriesInBrand || null
          }));
          
          // 加载默认系列的颜色
          if (defaultSeriesInBrand) {
            get().fetchSeriesColors(defaultSeriesInBrand.id);
          }
        } else {
          set({ currentSeries: currentSeries || null });
          // 加载当前系列的颜色
          if (currentSeries) {
            get().fetchSeriesColors(currentSeries.id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch hierarchy:', error);
    }
  },

  // 加载特定系列的颜色
  fetchSeriesColors: async (seriesId: string) => {
    try {
      const colors = await paletteApi.getPublicSeriesColors(seriesId);
      
      set((state) => {
        const updatedSeriesList = state.seriesList.map(series => {
          if (series.id === seriesId) {
            return {
              ...series,
              colors: colors.map((color: Color) => ({
                id: color.id,
                colorCode: color.color_code,
                name: color.name,
                hex: color.hex
              }))
            };
          }
          return series;
        });
        
        const updatedBrandList = state.brandList.map(brand => ({
          ...brand,
          series: brand.series.map(series => {
            if (series.id === seriesId) {
              return {
                ...series,
                colors: colors.map((color: Color) => ({
                  id: color.id,
                  colorCode: color.color_code,
                  name: color.name,
                  hex: color.hex
                }))
              };
            }
            return series;
          })
        }));
        
        const currentSeries = updatedSeriesList.find(s => s.id === seriesId);
        
        return {
          seriesList: updatedSeriesList,
          brandList: updatedBrandList,
          currentSeries: currentSeries || state.currentSeries
        };
      });
    } catch (error) {
      console.error('Failed to fetch series colors:', error);
    }
  },

  // 选择品牌
  selectBrand: (brandId: string) => {
    const { brandList } = get();
    const brand = brandList.find(b => b.id === brandId);
    
    if (brand && brand.series.length > 0) {
      // 选择该品牌的默认系列，或第一个系列
      const defaultSeries = brand.series.find(s => s.isDefault) || brand.series[0];
      
      set((state) => ({
        params: {
          ...state.params,
          brandId,
          seriesId: defaultSeries.id
        },
        currentSeries: defaultSeries
      }));
      
      // 加载该系列的颜色
      get().fetchSeriesColors(defaultSeries.id);
    } else {
      set((state) => ({
        params: {
          ...state.params,
          brandId,
          seriesId: ''
        },
        currentSeries: null
      }));
    }
  },

  // 选择系列
  selectSeries: (seriesId: string) => {
    const { seriesList } = get();
    const series = seriesList.find(s => s.id === seriesId);
    
    if (series) {
      set((state) => ({
        params: {
          ...state.params,
          brandId: series.brandId,
          seriesId
        },
        currentSeries: series
      }));
      
      // 加载该系列的颜色
      get().fetchSeriesColors(seriesId);
    }
  },

  // 批量替换颜色（将使用 sourceColorId 的单元格替换为 targetColorId）
  updateColorInPattern: (paletteId: string, sourceColorId: string, targetColorId: string, isBatch = false) =>
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
