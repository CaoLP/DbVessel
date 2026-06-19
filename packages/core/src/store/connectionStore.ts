import { create } from 'zustand';

export interface ConnectionProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  password?: string;
  database?: string;
  type: 'postgres' | 'mysql' | 'sqlite' | 'mssql' | 'oracle' | 'mongodb' | 'redis';
  // SSH Tunnel configs (Phase 5)
  useSshTunnel?: boolean;
  sshHost?: string;
  sshPort?: number;
  sshUser?: string;
  sshKey?: string;
}

interface ConnectionState {
  connections: ConnectionProfile[];
  addConnection: (conn: ConnectionProfile) => void;
  removeConnection: (id: string) => void;
  clearConnections: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  connections: [],
  addConnection: (conn) => set((state) => ({
    connections: [...state.connections, conn]
  })),
  removeConnection: (id) => set((state) => ({
    connections: state.connections.filter((c) => c.id !== id)
  })),
  clearConnections: () => set({ connections: [] })
}));
