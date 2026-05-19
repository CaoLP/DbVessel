import React from 'react';
import { useConnectionStore } from '@db-client/core';
import { Add, Data } from 'iconsax-react';

interface SidebarProps {
  onOpenAddModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenAddModal }) => {
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
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 cursor-pointer border border-transparent hover:border-space-border transition"
            >
              <Data size={20} className="text-indigo-400" />
              <div>
                <h4 className="text-sm font-semibold">{conn.name}</h4>
                <p className="text-xs text-gray-500">{conn.type}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
