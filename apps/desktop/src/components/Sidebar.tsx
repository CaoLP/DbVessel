import React, { useState } from 'react';
import { useConnectionStore, ConnectionProfile } from '@db-client/core';
import { Add, Data, Refresh, Folder2, FolderOpen } from 'iconsax-react';
import { DbExplorerTree, DatabaseSchema, TableAction } from './DbExplorerTree';

interface SidebarProps {
  onOpenAddModal: () => void;
  onSelectConnection: (conn: ConnectionProfile) => void;
  activeConnectionId: string | null;
  databases?: string[];
  databasesError?: string | null;
  onRetryListDatabases?: () => void;
  currentDatabase?: string | null;
  schemaByDb?: Record<string, DatabaseSchema>;
  schemaErrorByDb?: Record<string, string>;
  loadingDbName?: string | null;
  onExpandDatabase?: (dbName: string) => void;
  onRetryDatabase?: (dbName: string) => void;
  onTableDoubleClick?: (dbName: string, tableName: string) => void;
  onTableAction?: (dbName: string, action: TableAction, tableName: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenAddModal,
  onSelectConnection,
  activeConnectionId,
  databases,
  databasesError,
  onRetryListDatabases,
  currentDatabase,
  schemaByDb,
  schemaErrorByDb,
  loadingDbName,
  onExpandDatabase,
  onRetryDatabase,
  onTableDoubleClick,
  onTableAction,
}) => {
  const { connections } = useConnectionStore();
  const [expandedDbs, setExpandedDbs] = useState<Record<string, boolean>>({});

  const toggleDb = (dbName: string) => {
    const willExpand = !expandedDbs[dbName];
    setExpandedDbs((prev) => ({ ...prev, [dbName]: willExpand }));
    if (willExpand) onExpandDatabase?.(dbName);
  };

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
          connections.map((conn) => {
            const isActive = activeConnectionId === conn.id;
            return (
              <div key={conn.id}>
                <div
                  onClick={() => onSelectConnection(conn)}
                  className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer border transition ${
                    isActive
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

                {/* Each database on this server is its own expandable node — click to lazy-load
                    its schema (Navicat-style), instead of one fixed database per connection. */}
                {isActive && (
                  <div className="ml-2 mt-1 border-l border-space-border pl-2 space-y-0.5">
                    {databasesError && (
                      <div className="px-2 py-1.5 text-xs mb-1">
                        <p className="text-red-400 mb-1 break-words">Lỗi liệt kê database: {databasesError}</p>
                        <button
                          onClick={onRetryListDatabases}
                          className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                        >
                          <Refresh size={11} /> Thử lại
                        </button>
                      </div>
                    )}
                    {(databases ?? []).map((dbName) => {
                      const isExpanded = Boolean(expandedDbs[dbName]);
                      const isLoading = loadingDbName === dbName;
                      const dbSchema = schemaByDb?.[dbName];
                      const dbError = schemaErrorByDb?.[dbName];
                      const isLive = currentDatabase === dbName;
                      return (
                        <div key={dbName} className="flex flex-col">
                          <div
                            className="flex items-center gap-2 py-1.5 px-2 hover:bg-white/5 rounded cursor-pointer group"
                            onClick={() => toggleDb(dbName)}
                          >
                            {isExpanded ? (
                              <FolderOpen size={15} className="text-sky-400 shrink-0" variant="Bulk" />
                            ) : (
                              <Folder2 size={15} className="text-sky-400 shrink-0" variant="Bulk" />
                            )}
                            <span className="text-xs font-semibold text-gray-200 group-hover:text-white truncate">
                              {dbName}
                            </span>
                            {!isLive && <span className="w-1.5 h-1.5 rounded-full bg-gray-600 ml-auto shrink-0" title="Chưa kết nối" />}
                          </div>

                          {isExpanded && (
                            <div className="pl-2">
                              {isLoading ? (
                                <p className="text-gray-500 text-xs px-2 py-1.5 italic">Đang tải...</p>
                              ) : dbError ? (
                                <div className="px-2 py-1.5 text-xs">
                                  <p className="text-red-400 mb-1 break-words">Lỗi: {dbError}</p>
                                  <button
                                    onClick={() => onRetryDatabase?.(dbName)}
                                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                                  >
                                    <Refresh size={11} /> Thử lại
                                  </button>
                                </div>
                              ) : dbSchema ? (
                                <DbExplorerTree
                                  schema={dbSchema}
                                  onTableDoubleClick={(t) => onTableDoubleClick?.(dbName, t)}
                                  onTableAction={(a, t) => onTableAction?.(dbName, a, t)}
                                />
                              ) : (
                                <p className="text-gray-500 text-xs px-2 py-1.5 italic">Đang tải...</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
