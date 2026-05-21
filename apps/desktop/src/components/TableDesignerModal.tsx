import React, { useState } from 'react';
import { CloseSquare, Add, Trash } from 'iconsax-react';

interface ColumnDef {
  id: string;
  name: string;
  type: string;
  isPrimary: boolean;
  isNotNull: boolean;
}

interface TableDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tableName: string, columns: ColumnDef[]) => void;
}

export const TableDesignerModal: React.FC<TableDesignerModalProps> = ({ isOpen, onClose, onSave }) => {
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState<ColumnDef[]>([
    { id: '1', name: 'id', type: 'INTEGER', isPrimary: true, isNotNull: true }
  ]);

  if (!isOpen) return null;

  const handleAddColumn = () => {
    setColumns([...columns, { 
      id: Math.random().toString(), 
      name: `col_${columns.length + 1}`, 
      type: 'TEXT', 
      isPrimary: false, 
      isNotNull: false 
    }]);
  };

  const handleRemoveColumn = (id: string) => {
    setColumns(columns.filter(c => c.id !== id));
  };

  const handleChange = (id: string, field: keyof ColumnDef, value: any) => {
    setColumns(columns.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="w-[700px] glass-panel glass-glow rounded-xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-space-border shrink-0 bg-[#0A0710]">
          <h3 className="text-lg font-bold">Thiết kế Bảng mới</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <CloseSquare size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Tên Bảng</label>
            <input 
              required 
              value={tableName} 
              onChange={e => setTableName(e.target.value)}
              className="w-full bg-white/5 border border-space-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition"
              placeholder="users" 
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs text-gray-400 block">Cấu trúc Cột</label>
              <button 
                onClick={handleAddColumn}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
              >
                <Add size={14} /> Thêm Cột
              </button>
            </div>
            
            <div className="border border-space-border rounded-lg overflow-hidden bg-black/20">
              <div className="grid grid-cols-12 gap-2 p-2 border-b border-space-border bg-white/5 text-xs text-gray-400 font-medium">
                <div className="col-span-4">Tên Cột</div>
                <div className="col-span-3">Kiểu dữ liệu</div>
                <div className="col-span-2 text-center">Primary Key</div>
                <div className="col-span-2 text-center">Not Null</div>
                <div className="col-span-1 text-center">Xóa</div>
              </div>
              
              <div className="max-h-[300px] overflow-y-auto">
                {columns.map(col => (
                  <div key={col.id} className="grid grid-cols-12 gap-2 p-2 items-center border-b border-space-border/50 hover:bg-white/5">
                    <div className="col-span-4">
                      <input 
                        value={col.name}
                        onChange={e => handleChange(col.id, 'name', e.target.value)}
                        className="w-full bg-transparent border border-space-border rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="col-span-3">
                      <input 
                        value={col.type}
                        onChange={e => handleChange(col.id, 'type', e.target.value)}
                        className="w-full bg-transparent border border-space-border rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
                        placeholder="INTEGER / TEXT"
                      />
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <input 
                        type="checkbox" 
                        checked={col.isPrimary}
                        onChange={e => handleChange(col.id, 'isPrimary', e.target.checked)}
                        className="rounded border-space-border bg-white/5 text-amber-500"
                      />
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <input 
                        type="checkbox" 
                        checked={col.isNotNull}
                        onChange={e => handleChange(col.id, 'isNotNull', e.target.checked)}
                        className="rounded border-space-border bg-white/5 text-indigo-500"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button onClick={() => handleRemoveColumn(col.id)} className="text-red-400 hover:text-red-300">
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-space-border shrink-0 flex justify-end gap-3 bg-[#0A0710]">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-space-border hover:bg-white/5 rounded-lg text-sm transition"
          >
            Hủy
          </button>
          <button 
            onClick={() => {
              if (tableName) onSave(tableName, columns);
            }}
            disabled={!tableName || columns.length === 0}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-sm transition disabled:opacity-50"
          >
            Tạo Bảng
          </button>
        </div>
      </div>
    </div>
  );
};
