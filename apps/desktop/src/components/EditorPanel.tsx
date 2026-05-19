import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play } from 'iconsax-react';

interface EditorPanelProps {
  onExecute: (query: string) => void;
  isLoading: boolean;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({ onExecute, isLoading }) => {
  const [query, setQuery] = useState('SELECT * FROM users LIMIT 10;');

  return (
    <div className="flex flex-col h-full bg-space-surface border-b border-space-border relative">
      <div className="flex justify-between items-center px-4 py-2 bg-[#0A0710] border-b border-space-border">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">SQL Editor</h3>
        <button 
          onClick={() => onExecute(query)}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1 bg-green-600/20 text-green-400 hover:bg-green-600/40 rounded-md text-xs font-semibold transition disabled:opacity-50"
        >
          <Play size={14} variant="Bold" />
          {isLoading ? 'Running...' : 'Run Query'}
        </button>
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="sql"
          theme="vs-dark"
          value={query}
          onChange={(val) => setQuery(val || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            padding: { top: 16 },
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  );
};
