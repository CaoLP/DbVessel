import React from 'react';
import { ArrowLeft2, ArrowRight2 } from 'iconsax-react';

interface PaginationBarProps {
  currentPage: number;
  pageSize: number;
  totalRows: number | null;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  disabled?: boolean;
}

const PAGE_SIZE_OPTIONS = [50, 100, 200, 500];

export const PaginationBar: React.FC<PaginationBarProps> = ({
  currentPage,
  pageSize,
  totalRows,
  onPageChange,
  onPageSizeChange,
  disabled,
}) => {
  const totalPages = totalRows !== null ? Math.max(1, Math.ceil(totalRows / pageSize)) : null;
  const rangeStart = totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = totalRows !== null ? Math.min(currentPage * pageSize, totalRows) : currentPage * pageSize;

  return (
    <div className="flex items-center justify-between gap-3 px-2 py-1.5 border-t border-space-border bg-[#0A0710] flex-shrink-0 text-xs text-gray-400">
      <div>
        {totalRows !== null ? (
          <span>
            Dòng {rangeStart}–{rangeEnd} / {totalRows.toLocaleString('vi-VN')}
          </span>
        ) : (
          <span>Dòng {rangeStart}–{rangeEnd}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span>Mỗi trang:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={disabled}
            className="bg-white/5 border border-space-border rounded-md px-1.5 py-0.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={disabled || currentPage <= 1}
            className="p-1 rounded-md hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition"
          >
            <ArrowLeft2 size={14} />
          </button>
          <span>
            Trang {currentPage}{totalPages !== null ? ` / ${totalPages}` : ''}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={disabled || (totalPages !== null && currentPage >= totalPages)}
            className="p-1 rounded-md hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition"
          >
            <ArrowRight2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
