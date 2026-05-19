import { create } from 'zustand';

interface AIState {
  provider: 'openai' | 'anthropic' | 'gemini' | 'ollama';
  model: string;
  temperature: number;
  setAIConfig: (config: Partial<Pick<AIState, 'provider' | 'model' | 'temperature'>>) => void;
  clearConfig: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  provider: 'openai',
  model: 'gpt-4o-mini',
  temperature: 0.2,
  setAIConfig: (config) => set((state) => ({ ...state, ...config })),
  clearConfig: () => set({
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.2
  })
}));
