import React, { useState } from 'react';
import { Folder2, FolderOpen, RecordCircle, Hashtag, TextalignLeft, Calendar } from 'iconsax-react';

export interface ColumnNode {
  name: string;
  data_type: string;
  is_primary: boolean;
  is_nullable: boolean;
}

export interface TableNode {
  name: string;
  columns: ColumnNode[];
}

export interface DatabaseSchema {
  tables: TableNode[];
}

interface DbExplorerTreeProps {
  schema: DatabaseSchema;
  onTableDoubleClick: (tableName: string) => void;
}

const getDataTypeIcon = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('int') || t.includes('number') || t.includes('float')) {
    return <Hashtag size={14} className="text-blue-400" />;
  }
  if (t.includes('date') || t.includes('time')) {
    return <Calendar size={14} className="text-green-400" />;
  }
  return <TextalignLeft size={14} className="text-yellow-400" />;
};

export const DbExplorerTree: React.FC<DbExplorerTreeProps> = ({ schema, onTableDoubleClick }) => {
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});

  const toggleTable = (tableName: string) => {
    setExpandedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
  };

  if (!schema.tables || schema.tables.length === 0) {
    return <div className="text-xs text-gray-500 pl-4 py-2 italic">Không có bảng nào.</div>;
  }

  return (
    <div className="pl-4 mt-2 space-y-1">
      {schema.tables.map(table => {
        const isExpanded = expandedTables[table.name];
        return (
          <div key={table.name} className="flex flex-col">
            <div 
              className="flex items-center gap-2 py-1.5 px-2 hover:bg-white/5 rounded cursor-pointer group"
              onClick={() => toggleTable(table.name)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onTableDoubleClick(table.name);
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
                {table.columns.map(col => (
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
  );
};
