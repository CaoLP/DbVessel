import React, { useMemo, useState } from 'react';
import { useQueryStore } from '@db-client/core';
import { Star1, Trash, DocumentText, Clock } from 'iconsax-react';

interface HistoryPanelProps {
  connectionId: string | null;
  onLoadQuery: (sql: string) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ connectionId, onLoadQuery }) => {
  const { history, snippets, toggleFavorite, addSnippet, removeSnippet } = useQueryStore();
  const [tab, setTab] = useState<'history' | 'snippets'>('history');
  const [search, setSearch] = useState('');
  const [snippetName, setSnippetName] = useState('');
  const [snippetSql, setSnippetSql] = useState('');

  const filteredHistory = useMemo(() => {
    const scoped = connectionId ? history.filter((h) => h.connectionId === connectionId) : history;
    const term = search.trim().toLowerCase();
    const filtered = term ? scoped.filter((h) => h.sql.toLowerCase().includes(term)) : scoped;
    return [...filtered].sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite) || b.timestamp - a.timestamp);
  }, [history, connectionId, search]);

  const filteredSnippets = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? snippets.filter((s) => s.name.toLowerCase().includes(term) || s.sql.toLowerCase().includes(term)) : snippets;
  }, [snippets, search]);

  return (
    <div className="w-72 h-full glass-panel border-l border-space-border flex flex-col">
      <div className="flex border-b border-space-border">
        <button
          onClick={() => setTab('history')}
          className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wide ${tab === 'history' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500'}`}
        >
          Lịch sử
        </button>
        <button
          onClick={() => setTab('snippets')}
          className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wide ${tab === 'snippets' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500'}`}
        >
          Snippets
        </button>
      </div>

      <div className="p-2 border-b border-space-border">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm..."
          className="w-full bg-white/5 border border-space-border rounded-md px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {tab === 'history' ? (
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredHistory.length === 0 && (
            <p className="text-gray-500 text-xs text-center mt-4">Chưa có lịch sử truy vấn.</p>
          )}
          {filteredHistory.map((log) => (
            <div
              key={log.id}
              className="group bg-white/5 hover:bg-white/10 rounded-lg p-2 cursor-pointer transition"
              onClick={() => onLoadQuery(log.sql)}
            >
              <div className="flex items-start justify-between gap-1">
                <code className="text-[11px] text-gray-300 line-clamp-2 break-all">{log.sql}</code>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(log.id);
                  }}
                  className="shrink-0"
                >
                  <Star1
                    size={14}
                    variant={log.isFavorite ? 'Bold' : 'Linear'}
                    className={log.isFavorite ? 'text-amber-400' : 'text-gray-600 group-hover:text-gray-400'}
                  />
                </button>
              </div>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500">
                <Clock size={10} />
                {new Date(log.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          <div className="bg-white/5 rounded-lg p-2 space-y-1.5 mb-2">
            <input
              value={snippetName}
              onChange={(e) => setSnippetName(e.target.value)}
              placeholder="Tên snippet"
              className="w-full bg-black/30 border border-space-border rounded-md px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
            />
            <textarea
              value={snippetSql}
              onChange={(e) => setSnippetSql(e.target.value)}
              placeholder="SQL..."
              rows={2}
              className="w-full bg-black/30 border border-space-border rounded-md px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 resize-none"
            />
            <button
              onClick={() => {
                if (!snippetName.trim() || !snippetSql.trim()) return;
                addSnippet({ id: Math.random().toString(36).slice(2), name: snippetName.trim(), sql: snippetSql.trim() });
                setSnippetName('');
                setSnippetSql('');
              }}
              className="w-full text-xs bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-md py-1 transition"
            >
              + Lưu snippet
            </button>
          </div>

          {filteredSnippets.length === 0 && (
            <p className="text-gray-500 text-xs text-center mt-4">Chưa có snippet nào.</p>
          )}
          {filteredSnippets.map((s) => (
            <div
              key={s.id}
              className="group bg-white/5 hover:bg-white/10 rounded-lg p-2 cursor-pointer transition"
              onClick={() => onLoadQuery(s.sql)}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <DocumentText size={12} className="text-indigo-400 shrink-0" />
                  <span className="text-xs font-semibold text-gray-200 truncate">{s.name}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSnippet(s.id);
                  }}
                  className="shrink-0"
                >
                  <Trash size={13} className="text-gray-600 group-hover:text-red-400" />
                </button>
              </div>
              <code className="text-[11px] text-gray-400 line-clamp-2 break-all">{s.sql}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
