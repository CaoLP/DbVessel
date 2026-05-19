import { describe, it, expect, beforeEach } from 'vitest';
import { useAIStore } from '../src/store/aiStore';

describe('aiStore', () => {
  beforeEach(() => {
    useAIStore.getState().clearConfig();
  });

  it('nên cập nhật config AI thành công', () => {
    const store = useAIStore.getState();
    store.setAIConfig({
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      temperature: 0.5
    });

    expect(useAIStore.getState().provider).toBe('gemini');
    expect(useAIStore.getState().model).toBe('gemini-1.5-flash');
    expect(useAIStore.getState().temperature).toBe(0.5);
  });
});
