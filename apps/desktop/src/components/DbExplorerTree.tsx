import React, { useEffect, useMemo, useState } from 'react';
import {
  Folder2, FolderOpen, RecordCircle, Hashtag, TextalignLeft, Calendar,
  Data, Eye, Edit2, Trash, Refresh, Broom,
} from 'iconsax-react';

export interface ColumnNode {
  name: string;
  data_type: string;
  is_primary: boolean;
  is_nullable: boolean;
}

export interface TableNode {
  name: string;
  columns: ColumnNode[];
  schema_name: string;
}

export interface DatabaseSchema {
  tables: TableNode[];
}

export type TableAction = 'view' | 'rename' | 'drop' | 'truncate' | 'refresh';

interface DbExplorerTreeProps {
  schema: DatabaseSchema;
  /** Optional header label (e.g. connection/database name). Omit when the caller already
   * renders this context one level up (e.g. the database node in Sidebar's tree). */
  connectionName?: string;
  onTableDoubleClick: (tableName: string) => void;
  onTableAction?: (action: TableAction, tableName: string) => void;
}

const getDataTypeIcon = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('int') || t.includes('number') || t.includes('float') || t.includes('double') || t.includes('decimal')) {
    return <Hashtag size={14} className="text-blue-400" />;
  }
  if (t.includes('date') || t.includes('time')) {
    return <Calendar size={14} className="text-green-400" />;
  }
  return <TextalignLeft size={14} className="text-yellow-400" />;
};

interface ContextMenuState {
  x: number;
  y: number;
  tableName: string;
}

const TABLE_ACTIONS: { action: TableAction; label: string; icon: React.ReactNode; danger?: boolean }[] = [
  { action: 'view', label: 'Xem dữ liệu', icon: <Eye size={14} /> },
  { action: 'refresh', label: 'Làm mới schema', icon: <Refresh size={14} /> },
  { action: 'rename', label: 'Đổi tên bảng', icon: <Edit2 size={14} /> },
  { action: 'truncate', label: 'Làm trống bảng', icon: <Broom size={14} /> },
  { action: 'drop', label: 'Xoá bảng', icon: <Trash size={14} />, danger: true },
];

export const DbExplorerTree: React.FC<DbExplorerTreeProps> = ({ schema, connectionName, onTableDoubleClick, onTableAction }) => {
  const [expandedSchemas, setExpandedSchemas] = useState<Record<string, boolean>>({});
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const schemaGroups = useMemo(() => {
    const groups = new Map<string, TableNode[]>();
    for (const table of schema.tables ?? []) {
      const key = table.schema_name || 'default';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(table);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [schema.tables]);

  const toggleSchema = (name: string) => {
    setExpandedSchemas((prev) => ({ ...prev, [name]: prev[name] === false ? true : !prev[name] }));
  };
  const toggleTable = (key: string) => {
    setExpandedTables((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!schema.tables || schema.tables.length === 0) {
    return <div className="text-xs text-gray-500 pl-4 py-2 italic">Không có bảng nào.</div>;
  }

  return (
    <div className="pl-2 mt-1 space-y-1">
      {connectionName && (
        <div className="flex items-center gap-2 py-1 px-1 text-gray-400">
          <Data size={14} className="text-sky-400" />
          <span className="text-xs font-semibold truncate">{connectionName}</span>
        </div>
      )}

      <div className="pl-3 space-y-1">
        {schemaGroups.map(([schemaName, tables]) => {
          const isSchemaExpanded = expandedSchemas[schemaName] !== false;
          return (
            <div key={schemaName} className="flex flex-col">
              <div
                className="flex items-center gap-2 py-1 px-2 hover:bg-white/5 rounded cursor-pointer group"
                onClick={() => toggleSchema(schemaName)}
              >
                {isSchemaExpanded ? (
                  <FolderOpen size={14} className="text-emerald-400 shrink-0" variant="Bulk" />
                ) : (
                  <Folder2 size={14} className="text-emerald-400 shrink-0" variant="Bulk" />
                )}
                <span className="text-xs font-medium text-gray-300 group-hover:text-white truncate">{schemaName}</span>
                <span className="text-[10px] text-gray-600 ml-auto">{tables.length}</span>
              </div>

              {isSchemaExpanded && (
                <div className="pl-4 space-y-0.5 my-0.5">
                  {tables.map((table) => {
                    const tableKey = `${schemaName}.${table.name}`;
                    const isExpanded = expandedTables[tableKey];
                    return (
                      <div key={tableKey} className="flex flex-col">
                        <div
                          className="flex items-center gap-2 py-1.5 px-2 hover:bg-white/5 rounded cursor-pointer group"
                          onClick={() => toggleTable(tableKey)}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            onTableDoubleClick(table.name);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setContextMenu({ x: e.clientX, y: e.clientY, tableName: table.name });
                          }}
                        >
                          {isExpanded ? (
                            <FolderOpen size={16} className="text-indigo-400 shrink-0" variant="Bulk" />
                          ) : (
                            <Folder2 size={16} className="text-indigo-400 shrink-0" variant="Bulk" />
                          )}
                          <span className="text-sm font-medium text-gray-200 group-hover:text-white truncate">
                            {table.name}
                          </span>
                        </div>

                        {isExpanded && (
                          <div className="pl-6 space-y-1 my-1">
                            {table.columns.map((col) => (
                              <div key={col.name} className="flex items-center justify-between py-1 px-2 hover:bg-white/5 rounded group">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  {col.is_primary ? (
                                    <RecordCircle size={14} className="text-amber-400 shrink-0" variant="Bold" />
                                  ) : (
                                    getDataTypeIcon(col.data_type)
                                  )}
                                  <span className="text-xs text-gray-300 truncate" title={col.name}>{col.name}</span>
                                </div>
                                <span className="text-[10px] text-gray-500 uppercase tracking-wide ml-2 shrink-0">{col.data_type}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 w-48 bg-[#0A0710] border border-space-border rounded-lg shadow-xl overflow-hidden py-1"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {TABLE_ACTIONS.map(({ action, label, icon, danger }) => (
            <button
              key={action}
              onClick={() => {
                onTableAction?.(action, contextMenu.tableName);
                setContextMenu(null);
              }}
              className={`flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs transition ${
                danger ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
