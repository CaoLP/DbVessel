import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Sidebar } from './components/Sidebar';
import { ConnectionModal } from './components/ConnectionModal';
import { EditorPanel } from './components/EditorPanel';
import { DataGrid } from './components/DataGrid';
import { useConnectionStore } from '@db-client/core';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [dbSessionId, setDbSessionId] = useState<string | null>(null);
  
  const [queryResult, setQueryResult] = useState<any[]>([]);
  const [affectedRows, setAffectedRows] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { connections } = useConnectionStore();

  const handleSelectConnection = async (connId: string) => {
    const conn = connections.find(c => c.id === connId);
    if (!conn) return;
    
    setIsLoading(true);
    setError(null);
    try {
      // Build dummy connection string for SQLite for MVP, or full for Postgres
      let connectionString = '';
      if (conn.type === 'sqlite') {
        connectionString = `sqlite://${conn.name}.db?mode=rwc`;
      } else {
        connectionString = `${conn.type}://${conn.user}@${conn.host}:${conn.port}`;
      }
      
      const sessionId: string = await invoke('db_connect', { 
        dbType: conn.type, 
        connectionString 
      });
      setDbSessionId(sessionId);
      setActiveConnectionId(connId);
      setQueryResult([]);
      setAffectedRows(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteQuery = async (query: string) => {
    if (!dbSessionId) {
      setError('Please select a connection first.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const result: { rows: string[], affected_rows: number } = await invoke('db_execute_query', {
        connectionId: dbSessionId,
        query
      });
      
      // Parse JSON rows
      const parsedRows = result.rows.map(r => JSON.parse(r));
      setQueryResult(parsedRows);
      setAffectedRows(result.affected_rows);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-space-bg text-white overflow-hidden">
      <Sidebar onOpenAddModal={() => setIsModalOpen(true)} />
      
      <div className="flex-1 flex flex-col h-full">
        {!activeConnectionId ? (
          <div className="flex-1 flex flex-col justify-center items-center">
             <p className="text-gray-400 mb-4">Chọn hoặc thêm kết nối từ thanh bên để bắt đầu thao tác.</p>
             <div className="flex gap-2">
               {connections.map(c => (
                 <button 
                   key={c.id} 
                   onClick={() => handleSelectConnection(c.id)}
                   className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold transition"
                 >
                   Connect to {c.name}
                 </button>
               ))}
             </div>
             {error && <p className="text-red-400 mt-4 text-sm bg-red-900/20 p-3 rounded">{error}</p>}
             {isLoading && <p className="text-indigo-400 mt-4 text-sm">Connecting...</p>}
          </div>
        ) : (
          <>
            <div className="h-[40%] min-h-[200px]">
              <EditorPanel onExecute={handleExecuteQuery} isLoading={isLoading} />
            </div>
            <div className="h-[60%] bg-[#05030A] p-2 flex flex-col">
              {error && (
                <div className="bg-red-900/20 text-red-400 p-3 mb-2 rounded-lg text-sm border border-red-900/50">
                  {error}
                </div>
              )}
              {affectedRows !== null && queryResult.length === 0 && !error && (
                <div className="text-green-400 p-3 text-sm">
                  Query executed successfully. Affected rows: {affectedRows}
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
    </div>
  );
}

export default App;
