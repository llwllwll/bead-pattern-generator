import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';
export type Language = 'zh' | 'en';

interface HistorySnapshot {
  // 为将来扩展预留（可以记录 image/pattern 状态快照 ID）
  timestamp: number;
}

interface UIState {
  themeMode: ThemeMode;
  language: Language;
  hasSeenTutorial: boolean;
  history: HistorySnapshot[];
  future: HistorySnapshot[];
  canUndo: boolean;
  canRedo: boolean;

  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
  setHasSeenTutorial: (val: boolean) => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  themeMode: 'light',
  language: 'zh',
  hasSeenTutorial: false,
  history: [],
  future: [],
  canUndo: false,
  canRedo: false,

  toggleTheme: () =>
    set((state) => ({
      themeMode: state.themeMode === 'light' ? 'dark' : 'light'
    })),

  setLanguage: (language) => set({ language }),

  setHasSeenTutorial: (hasSeenTutorial) => set({ hasSeenTutorial }),

  pushHistory: () => {
    const snapshot: HistorySnapshot = { timestamp: Date.now() };
    const { history } = get();
    set({
      history: [...history, snapshot],
      future: [],
      canUndo: true,
      canRedo: false
    });
  },

  undo: () => {
    const { history, future, canUndo } = get();
    if (!canUndo || history.length === 0) return;
    const newHistory = history.slice(0, -1);
    const last = history[history.length - 1];
    set({
      history: newHistory,
      future: [last, ...future],
      canUndo: newHistory.length > 0,
      canRedo: true
    });
  },

  redo: () => {
    const { history, future, canRedo } = get();
    if (!canRedo || future.length === 0) return;
    const [first, ...rest] = future;
    set({
      history: [...history, first],
      future: rest,
      canUndo: true,
      canRedo: rest.length > 0
    });
  }
}));

