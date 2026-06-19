import { create } from 'zustand';

export interface QueryLog {
  id: string;
  sql: string;
  connectionId: string;
  timestamp: number;
  isFavorite?: boolean;
}

export interface SQLSnippet {
  id: string;
  name: string;
  sql: string;
}

interface QueryState {
  history: QueryLog[];
  snippets: SQLSnippet[];
  addQueryLog: (sql: string, connectionId: string) => void;
  clearHistory: () => void;
  toggleFavorite: (id: string) => void;
  addSnippet: (snippet: SQLSnippet) => void;
  removeSnippet: (id: string) => void;
  clearSnippets: () => void;
}

export const useQueryStore = create<QueryState>((set) => ({
  history: [],
  snippets: [],
  addQueryLog: (sql, connectionId) => set((state) => {
    const newLog: QueryLog = {
      id: Math.random().toString(36).substring(7),
      sql,
      connectionId,
      timestamp: Date.now()
    };
    const updatedHistory = [newLog, ...state.history];
    if (updatedHistory.length > 500) {
      updatedHistory.pop();
    }
    return { history: updatedHistory };
  }),
  clearHistory: () => set({ history: [] }),
  toggleFavorite: (id) => set((state) => ({
    history: state.history.map((log) => log.id === id ? { ...log, isFavorite: !log.isFavorite } : log)
  })),
  addSnippet: (snippet) => set((state) => ({
    snippets: [...state.snippets, snippet]
  })),
  removeSnippet: (id) => set((state) => ({
    snippets: state.snippets.filter((s) => s.id !== id)
  })),
  clearSnippets: () => set({ snippets: [] })
}));
