import { describe, it, expect, beforeEach } from 'vitest';
import { useConnectionStore } from '../src/store/connectionStore';

describe('connectionStore', () => {
  beforeEach(() => {
    useConnectionStore.getState().clearConnections();
  });

  it('nên thêm mới connection profile thành công', () => {
    const store = useConnectionStore.getState();
    const newProfile = {
      id: 'conn-1',
      name: 'Local Postgres',
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      database: 'my_db',
      type: 'postgres' as const
    };

    store.addConnection(newProfile);
    expect(useConnectionStore.getState().connections).toHaveLength(1);
    expect(useConnectionStore.getState().connections[0].name).toBe('Local Postgres');
  });

  it('nên xóa connection profile thành công', () => {
    const store = useConnectionStore.getState();
    store.addConnection({
      id: 'conn-1',
      name: 'Local Postgres',
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      database: 'my_db',
      type: 'postgres'
    });
    
    store.removeConnection('conn-1');
    expect(useConnectionStore.getState().connections).toHaveLength(0);
  });
});
