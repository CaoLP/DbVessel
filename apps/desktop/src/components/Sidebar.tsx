import React from 'react';
import { useConnectionStore, ConnectionProfile } from '@db-client/core';
import { Add, Data } from 'iconsax-react';
import { DbExplorerTree, DatabaseSchema } from './DbExplorerTree';

interface SidebarProps {
  onOpenAddModal: () => void;
  onSelectConnection: (conn: ConnectionProfile) => void;
  activeConnectionId: string | null;
  schema?: DatabaseSchema | null;
  onTableDoubleClick?: (tableName: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenAddModal, onSelectConnection, activeConnectionId, schema, onTableDoubleClick }) => {
  const { connections } = useConnectionStore();

  return (
    <div className="w-64 h-screen glass-panel flex flex-col border-r border-space-border">
      <div className="p-4 flex justify-between items-center border-b border-space-border">
        <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent">DataViewer</h1>
        <button 
          onClick={onOpenAddModal}
          className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 transition"
        >
          <Add size={18} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {connections.length === 0 ? (
          <p className="text-gray-500 text-sm text-center mt-4">Chưa có kết nối nào.</p>
        ) : (
          connections.map((conn) => (
            <div 
              key={conn.id} 
              <div 
                onClick={() => onSelectConnection(conn)}
                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer border transition ${
                  activeConnectionId === conn.id
                    ? 'bg-indigo-600/20 border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                    : 'hover:bg-white/5 border-transparent hover:border-space-border'
                }`}
              >
                <Data size={20} className="text-indigo-400" />
                <div>
                  <h4 className="text-sm font-semibold">{conn.name}</h4>
                  <p className="text-xs text-gray-500">{conn.type}</p>
                </div>
              </div>
              
              {/* Nested Schema Tree for Active Connection */}
              {activeConnectionId === conn.id && schema && onTableDoubleClick && (
                <div className="ml-2 mt-1 border-l border-space-border pl-2">
                  <DbExplorerTree schema={schema} onTableDoubleClick={onTableDoubleClick} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
