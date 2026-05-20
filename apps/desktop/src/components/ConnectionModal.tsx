import React, { useState } from 'react';
import { useConnectionStore } from '@db-client/core';
import { CloseSquare } from 'iconsax-react';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({ isOpen, onClose }) => {
  const { addConnection } = useConnectionStore();
  
  // Basic settings
  const [name, setName] = useState('');
  const [type, setType] = useState<'postgres' | 'mysql' | 'sqlite' | 'mongodb'>('postgres');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState(5432);
  const [user, setUser] = useState('postgres');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('');

  // SSH settings
  const [useSshTunnel, setUseSshTunnel] = useState(false);
  const [sshHost, setSshHost] = useState('');
  const [sshPort, setSshPort] = useState(22);
  const [sshUser, setSshUser] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addConnection({
      id: Math.random().toString(),
      name,
      type,
      host,
      port,
      user,
      password,
      database,
      useSshTunnel,
      sshHost,
      sshPort,
      sshUser,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="w-[500px] glass-panel glass-glow rounded-xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-space-border shrink-0">
          <h3 className="text-lg font-bold">Thêm kết nối mới</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
            <CloseSquare size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
          {/* General section */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">User</label>
                <input 
                  required={type !== 'sqlite'}
                  value={user} 
                  onChange={e => setUser(e.target.value)}
                  className="w-full bg-white/5 border border-space-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition" 
                  placeholder="postgres"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Password</label>
                <input 
                  type="password"
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-space-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition" 
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Database Name</label>
              <input 
                value={database} 
                onChange={e => setDatabase(e.target.value)}
                className="w-full bg-white/5 border border-space-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition" 
                placeholder="public"
              />
            </div>
          </div>

          <hr className="border-space-border" />

          {/* SSH Tunnel section */}
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input 
                type="checkbox" 
                checked={useSshTunnel}
                onChange={e => setUseSshTunnel(e.target.checked)}
                className="rounded border-space-border bg-white/5 text-indigo-500 focus:ring-indigo-500"
              />
              Sử dụng SSH Tunnel (Proxy)
            </label>
            
            {useSshTunnel && (
              <div className="mt-4 p-4 bg-white/5 border border-space-border rounded-lg space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-gray-400 block mb-1">SSH Host</label>
                    <input 
                      required 
                      value={sshHost} 
                      onChange={e => setSshHost(e.target.value)}
                      className="w-full bg-white/10 border border-space-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">SSH Port</label>
                    <input 
                      required 
                      type="number" 
                      value={sshPort} 
                      onChange={e => setSshPort(Number(e.target.value))}
                      className="w-full bg-white/10 border border-space-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500 transition" 
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">SSH User</label>
                  <input 
                    required 
                    value={sshUser} 
                    onChange={e => setSshUser(e.target.value)}
                    className="w-full bg-white/10 border border-space-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500 transition" 
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Private Key (hoặc Password)</label>
                  <input 
                    type="password"
                    placeholder="Chức năng SSH Tunnel sẽ hỗ trợ ở Phase 5"
                    disabled
                    className="w-full bg-white/5 border border-space-border rounded-lg px-3 py-1.5 text-sm text-gray-500 opacity-50 cursor-not-allowed" 
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-space-border shrink-0">
          <button 
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-sm transition"
          >
            Lưu kết nối
          </button>
        </div>
      </form>
    </div>
  );
};
