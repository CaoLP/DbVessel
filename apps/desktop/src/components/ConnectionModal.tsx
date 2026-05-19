import React, { useState } from 'react';
import { useConnectionStore } from '@db-client/core';
import { CloseSquare } from 'iconsax-react';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({ isOpen, onClose }) => {
  const { addConnection } = useConnectionStore();
  const [name, setName] = useState('');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState(5432);
  const [user, setUser] = useState('postgres');
  const [type, setType] = useState<'postgres' | 'mysql' | 'sqlite' | 'mongodb'>('postgres');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addConnection({
      id: Math.random().toString(),
      name,
      host,
      port,
      user,
      type,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="w-[450px] glass-panel glass-glow rounded-xl p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-space-border pb-3">
          <h3 className="text-lg font-bold">Thêm kết nối mới</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
            <CloseSquare size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Tên kết nối</label>
            <input 
              required 
              value={name} 
              onChange={e => setName(e.target.value)}
              className="w-full bg-white/5 border border-space-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition"
              placeholder="Local Postgres" 
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Loại CSDL</label>
            <select 
              value={type} 
              onChange={e => setType(e.target.value as any)}
              className="w-full bg-slate-900 border border-space-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="postgres">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="sqlite">SQLite</option>
              <option value="mongodb">MongoDB</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-400 block mb-1">Host</label>
              <input 
                required 
                value={host} 
                onChange={e => setHost(e.target.value)}
                className="w-full bg-white/5 border border-space-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition" 
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Port</label>
              <input 
                required 
                type="number" 
                value={port} 
                onChange={e => setPort(Number(e.target.value))}
                className="w-full bg-white/5 border border-space-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition" 
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Tên đăng nhập (User)</label>
            <input 
              required 
              value={user} 
              onChange={e => setUser(e.target.value)}
              className="w-full bg-white/5 border border-space-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition" 
              placeholder="postgres"
            />
          </div>
        </div>

        <button 
          type="submit"
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-sm transition"
        >
          Lưu kết nối
        </button>
      </form>
    </div>
  );
};
