import { describe, it, expect, beforeEach } from 'vitest';
import { useQueryStore } from '../src/store/queryStore';

describe('queryStore', () => {
  beforeEach(() => {
    useQueryStore.getState().clearHistory();
    useQueryStore.getState().clearSnippets();
  });

  it('nên lưu lịch sử câu lệnh SQL chạy gần nhất', () => {
    const store = useQueryStore.getState();
    store.addQueryLog('SELECT * FROM users;', 'conn-1');
    expect(useQueryStore.getState().history).toHaveLength(1);
    expect(useQueryStore.getState().history[0].sql).toBe('SELECT * FROM users;');
  });

  it('nên giới hạn số lượng lịch sử tối đa là 500 bản ghi', () => {
    const store = useQueryStore.getState();
    for (let i = 0; i < 505; i++) {
      store.addQueryLog(`SELECT ${i};`, 'conn-1');
    }
    expect(useQueryStore.getState().history).toHaveLength(500);
    expect(useQueryStore.getState().history[0].sql).toBe('SELECT 504;');
  });
});
