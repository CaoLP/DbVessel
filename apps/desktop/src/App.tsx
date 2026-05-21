import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ConnectionModal } from './components/ConnectionModal';
import { EditorPanel } from './components/EditorPanel';
import { DataGrid } from './components/DataGrid';
import { TableDesignerModal } from './components/TableDesignerModal';
import { useConnectionStore, ConnectionProfile } from '@db-client/core';

// Safe Tauri invoke wrapper — works in Tauri shell and falls back in browser
async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  // @ts-ignore
  if (window.__TAURI__) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(cmd, args);
  }
  throw new Error('Tauri is not available. Please run with `npm run tauri dev`.');
}

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [activeConnection, setActiveConnection] = useState<ConnectionProfile | null>(null);
  const [dbSessionId, setDbSessionId] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<any[]>([]);
  const [affectedRows, setAffectedRows] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [schema, setSchema] = useState<any>(null);

  const { connections } = useConnectionStore();

  const handleSelectConnection = async (conn: ConnectionProfile) => {
    setIsLoading(true);
    setError(null);
    setQueryResult([]);
    setAffectedRows(null);

    try {
      let connectionString = '';
      if (conn.type === 'sqlite') {
        // SQLite: create a local file next to app
        connectionString = `sqlite://${conn.name}.db?mode=rwc`;
      } else {
        const auth = conn.password ? `${conn.user}:${conn.password}` : conn.user;
        connectionString = `${conn.type}://${auth}@${conn.host}:${conn.port}/${conn.database || ''}`;
      }

      const sessionId = await tauriInvoke<string>('db_connect', {
        dbType: conn.type,
        connectionString,
      });

      setDbSessionId(sessionId);
      setActiveConnection(conn);

      // Fetch schema
      try {
        const dbSchema = await tauriInvoke('db_get_schema', { connectionId: sessionId });
        setSchema(dbSchema);
      } catch (e) {
        console.warn("Failed to get schema:", e);
      }
    } catch (err: any) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteQuery = async (query: string) => {
    if (!dbSessionId) {
      setError('Chọn một kết nối trước khi chạy truy vấn.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await tauriInvoke<{ rows: string[]; affected_rows: number }>('db_execute_query', {
        connectionId: dbSessionId,
        query,
      });

      const parsedRows = result.rows.map((r) => JSON.parse(r));
      setQueryResult(parsedRows);
      setAffectedRows(result.affected_rows);
    } catch (err: any) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!dbSessionId) return;
    try {
      await tauriInvoke('db_disconnect', { connectionId: dbSessionId });
    } catch (_) {}
    setDbSessionId(null);
    setActiveConnection(null);
    setSchema(null);
    setQueryResult([]);
    setAffectedRows(null);
    setError(null);
  };

  const handleCreateTable = async (tableName: string, columns: any[]) => {
    if (!dbSessionId) return;
    
    // Generate CREATE TABLE SQL (SQLite dialect for MVP)
    const colsSql = columns.map(col => {
      let def = `${col.name} ${col.type}`;
      if (col.isPrimary) def += ' PRIMARY KEY';
      if (col.isNotNull) def += ' NOT NULL';
      return def;
    }).join(', ');
    
    const sql = `CREATE TABLE ${tableName} (${colsSql});`;
    
    setIsTableModalOpen(false);
    await handleExecuteQuery(sql);
    
    // Refresh schema
    try {
      const dbSchema = await tauriInvoke('db_get_schema', { connectionId: dbSessionId });
      setSchema(dbSchema);
    } catch (e) {}
  };

  return (
    <div className="flex h-screen w-screen bg-space-bg text-white overflow-hidden">
      <Sidebar
        onOpenAddModal={() => setIsModalOpen(true)}
        onSelectConnection={handleSelectConnection}
        activeConnectionId={activeConnection?.id ?? null}
        schema={schema}
        onTableDoubleClick={(tableName) => handleExecuteQuery(`SELECT * FROM ${tableName} LIMIT 100`)}
      />

      <div className="flex-1 flex flex-col h-full">
        {/* Top bar */}
        {activeConnection && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-space-border bg-[#0A0710]">
            <span className="text-xs text-gray-400">
              Đang kết nối: <span className="text-indigo-400 font-semibold">{activeConnection.name}</span>
              <span className="text-gray-600 ml-2">({activeConnection.type})</span>
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsTableModalOpen(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition"
              >
                + Tạo Bảng Mới
              </button>
              <button
                onClick={handleDisconnect}
                className="text-xs text-red-400 hover:text-red-300 transition border-l border-space-border pl-3"
              >
                Ngắt kết nối
              </button>
            </div>
          </div>
        )}

        {!activeConnection ? (
          <div className="flex-1 flex flex-col justify-center items-center gap-4">
            <div className="text-4xl">🗄️</div>
            <p className="text-gray-400 text-sm">
              {connections.length === 0
                ? 'Nhấn "+" ở thanh bên để thêm kết nối đầu tiên.'
                : 'Chọn một kết nối từ thanh bên để bắt đầu.'}
            </p>
            {isLoading && <p className="text-indigo-400 text-sm animate-pulse">Đang kết nối...</p>}
            {error && (
              <div className="bg-red-900/20 text-red-400 px-4 py-3 rounded-lg text-sm border border-red-900/40 max-w-md text-center">
                {error}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* SQL Editor (top 40%) */}
            <div className="h-[40%] min-h-[160px]">
              <EditorPanel onExecute={handleExecuteQuery} isLoading={isLoading} />
            </div>

            {/* Result area (bottom 60%) */}
            <div className="flex-1 bg-[#05030A] p-2 flex flex-col overflow-hidden">
              {error && (
                <div className="bg-red-900/20 text-red-400 p-3 mb-2 rounded-lg text-sm border border-red-900/50 flex-shrink-0">
                  {error}
                </div>
              )}
              {affectedRows !== null && queryResult.length === 0 && !error && (
                <div className="text-green-400 p-3 text-sm flex-shrink-0">
                  ✓ Lệnh thực thi thành công. Hàng bị ảnh hưởng: {affectedRows}
                </div>
              )}
              <div className="flex-1 rounded-xl overflow-hidden border border-space-border">
                <DataGrid rowData={queryResult} />
              </div>
            </div>
          </>
        )}
      </div>

      <ConnectionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <TableDesignerModal 
        isOpen={isTableModalOpen} 
        onClose={() => setIsTableModalOpen(false)} 
        onSave={handleCreateTable} 
      />
    </div>
  );
}

export default App;
