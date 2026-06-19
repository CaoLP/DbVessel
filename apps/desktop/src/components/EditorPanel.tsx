import React, { useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditorNS, languages as MonacoLanguagesNS, Position } from 'monaco-editor';
import { Play } from 'iconsax-react';
import { DatabaseSchema } from './DbExplorerTree';

interface EditorPanelProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: (query: string) => void;
  isLoading: boolean;
  schema?: DatabaseSchema | null;
}

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
  'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'GROUP BY', 'ORDER BY', 'LIMIT',
  'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'AND', 'OR', 'NOT', 'NULL', 'AS',
];

export const EditorPanel: React.FC<EditorPanelProps> = ({ value, onChange, onExecute, isLoading, schema }) => {
  const schemaRef = useRef<DatabaseSchema | null | undefined>(schema);
  schemaRef.current = schema;

  const handleMount: OnMount = (_editor, monaco) => {
    monaco.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: ['.', ' '],
      provideCompletionItems: (
        model: MonacoEditorNS.ITextModel,
        position: Position
      ): MonacoLanguagesNS.CompletionList => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions: MonacoLanguagesNS.CompletionItem[] = [];
        const currentSchema = schemaRef.current;

        for (const keyword of SQL_KEYWORDS) {
          suggestions.push({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            range,
          });
        }

        if (currentSchema?.tables) {
          for (const table of currentSchema.tables) {
            suggestions.push({
              label: table.name,
              kind: monaco.languages.CompletionItemKind.Class,
              detail: 'table',
              insertText: table.name,
              range,
            });
            for (const col of table.columns) {
              suggestions.push({
                label: col.name,
                kind: monaco.languages.CompletionItemKind.Field,
                detail: `${table.name}.${col.name} (${col.data_type})`,
                insertText: col.name,
                range,
              });
            }
          }
        }

        return { suggestions };
      },
    });
  };

  return (
    <div className="flex flex-col h-full bg-space-surface border-b border-space-border relative">
      <div className="flex justify-between items-center px-4 py-2 bg-[#0A0710] border-b border-space-border">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">SQL Editor</h3>
        <button
          onClick={() => onExecute(value)}
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
          value={value}
          onMount={handleMount}
          onChange={(val) => onChange(val || '')}
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
