import React, { useCallback, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { CellValueChangedEvent, GetRowIdParams, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { Add, Trash, DocumentDownload, TickCircle, CloseCircle } from 'iconsax-react';
import { ColumnNode } from './DbExplorerTree';
import { toSqlLiteral, escapeIdentifier } from '../lib/sql';
import { exportRowsAsCsv, exportRowsAsJson, exportRowsAsSqlInserts } from '../lib/export';

// AG Grid v33+ uses a modular architecture — without this, the grid silently renders nothing
// at all (no columns, no rows) and logs "error #272 No AG Grid modules are registered!".
ModuleRegistry.registerModules([AllCommunityModule]);

interface DataGridProps {
  rowData: any[];
  /** Schema for the table currently being viewed, if any (enables editing/add/delete/export). */
  tableColumns?: ColumnNode[] | null;
  tableName?: string | null;
  /**
   * Executes a mutating SQL statement (UPDATE/INSERT/DELETE) against the active connection.
   * `localPatch`, when given, updates the displayed rows in place instead of re-running the
   * original SELECT — re-running a query with no ORDER BY doesn't guarantee row order between
   * calls, so a blind refetch after every cell edit makes rows appear to jump around/vanish
   * even though nothing was actually lost.
   */
  onMutate?: (sql: string, localPatch?: (rows: any[]) => any[]) => Promise<void>;
}

const PENDING_FLAG = '__pendingNewRow';

export const DataGrid: React.FC<DataGridProps> = ({ rowData, tableColumns, tableName, onMutate }) => {
  const gridRef = useRef<AgGridReact>(null);
  const [busy, setBusy] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  // A not-yet-saved row being edited in the grid before it's actually INSERTed. Letting the
  // user fill in values first (rather than blindly INSERTing NULL for every non-PK column,
  // which the previous version did) avoids tripping NOT NULL constraints on columns we have
  // no default for.
  const [pendingRow, setPendingRow] = useState<Record<string, any> | null>(null);

  const pkCols = useMemo(
    () => (tableColumns ?? []).filter((c) => c.is_primary).map((c) => c.name),
    [tableColumns]
  );
  const canEdit = Boolean(tableName) && pkCols.length > 0 && Boolean(onMutate);

  // Prefer schema-driven columns (works even when the table is currently empty); fall back to
  // inferring from the first result row for ad-hoc queries with no schema attached.
  const columnFields = useMemo(() => {
    if (tableColumns && tableColumns.length > 0) return tableColumns.map((c) => c.name);
    if (rowData.length > 0) return Object.keys(rowData[0]);
    return [];
  }, [tableColumns, rowData]);

  const columnDefs = useMemo(
    () =>
      columnFields.map((field) => ({
        field,
        sortable: true,
        filter: true,
        resizable: true,
        editable: canEdit,
      })),
    [columnFields, canEdit]
  );

  const displayRows = useMemo(() => (pendingRow ? [...rowData, pendingRow] : rowData), [rowData, pendingRow]);

  // Without this, AG Grid identifies rows by array index by default. Every edit replaces the
  // whole `rowData` array with a freshly-fetched one (see DataGrid -> onMutate -> App's
  // handleMutate, which re-runs the last SELECT), so index-based identity causes AG Grid to
  // mis-track which DOM row maps to which data row, corrupting the just-edited cell's display
  // even though the underlying data is correct (confirmed via console diagnostics: the
  // refetched row at the right primary key has the right value).
  const getRowId = useCallback(
    (params: GetRowIdParams) => {
      if (params.data[PENDING_FLAG]) return '__pending_new_row__';
      if (pkCols.length > 0) return pkCols.map((c) => String(params.data[c])).join('::');
      return JSON.stringify(params.data);
    },
    [pkCols]
  );

  const onCellValueChanged = async (e: CellValueChangedEvent) => {
    if (!canEdit || !tableName || !onMutate) return;
    if (e.oldValue === e.newValue) return;

    if (e.data[PENDING_FLAG]) {
      setPendingRow({ ...e.data });
      return;
    }

    const field = e.colDef.field as string;
    const pkValues = pkCols.map((pkCol) => (pkCol === field ? e.oldValue : e.data[pkCol]));
    const whereParts = pkCols.map((pkCol, i) => `${escapeIdentifier(pkCol)} = ${toSqlLiteral(pkValues[i])}`);
    const sql = `UPDATE ${escapeIdentifier(tableName)} SET ${escapeIdentifier(field)} = ${toSqlLiteral(
      e.newValue
    )} WHERE ${whereParts.join(' AND ')}`;

    const localPatch = (rows: any[]) =>
      rows.map((r) => {
        const isTargetRow = pkCols.every((pkCol, i) => String(r[pkCol]) === String(pkValues[i]));
        return isTargetRow ? { ...r, [field]: e.newValue } : r;
      });

    setBusy(true);
    try {
      await onMutate(sql, localPatch);
    } finally {
      setBusy(false);
    }
  };

  const handleAddRow = () => {
    if (!canEdit || !tableColumns) return;
    const blank: Record<string, any> = { [PENDING_FLAG]: true };
    for (const field of columnFields) blank[field] = null;
    setPendingRow(blank);
  };

  const handleSavePendingRow = async () => {
    if (!canEdit || !tableName || !onMutate || !pendingRow || !tableColumns) return;
    // Primary key columns are skipped when left empty so autoincrement/sequence defaults
    // apply; if the user did type a value into a manual (non-autoincrement) PK, include it.
    const insertCols = tableColumns.filter((c) => !c.is_primary || pendingRow[c.name] != null);
    setBusy(true);
    try {
      if (insertCols.length === 0) {
        await onMutate(`INSERT INTO ${escapeIdentifier(tableName)} DEFAULT VALUES`);
      } else {
        const colList = insertCols.map((c) => escapeIdentifier(c.name)).join(', ');
        const valueList = insertCols.map((c) => toSqlLiteral(pendingRow[c.name])).join(', ');
        await onMutate(`INSERT INTO ${escapeIdentifier(tableName)} (${colList}) VALUES (${valueList})`);
      }
      setPendingRow(null);
    } finally {
      setBusy(false);
    }
  };

  const handleCancelPendingRow = () => setPendingRow(null);

  const handleDeleteSelected = async () => {
    if (!canEdit || !tableName || !onMutate) return;
    const selected = (gridRef.current?.api.getSelectedRows() ?? []).filter((r) => !r[PENDING_FLAG]);
    if (selected.length === 0) return;
    if (!window.confirm(`Xoá ${selected.length} dòng đã chọn?`)) return;

    setBusy(true);
    try {
      for (const row of selected) {
        const whereParts = pkCols.map((pkCol) => `${escapeIdentifier(pkCol)} = ${toSqlLiteral(row[pkCol])}`);
        await onMutate(`DELETE FROM ${escapeIdentifier(tableName)} WHERE ${whereParts.join(' AND ')}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleExport = (format: 'csv' | 'json' | 'sql') => {
    setShowExportMenu(false);
    const filename = `${tableName ?? 'query-result'}.${format === 'sql' ? 'sql' : format}`;
    if (format === 'csv') exportRowsAsCsv(rowData, filename);
    else if (format === 'json') exportRowsAsJson(rowData, filename);
    else exportRowsAsSqlInserts(rowData, tableName ?? 'results', filename);
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-b border-space-border bg-[#0A0710] flex-shrink-0">
        <div className="flex items-center gap-2">
          {canEdit && !pendingRow && (
            <>
              <button
                onClick={handleAddRow}
                disabled={busy}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 transition disabled:opacity-50"
              >
                <Add size={14} /> Thêm dòng
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={busy}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-red-600/20 text-red-400 hover:bg-red-600/40 transition disabled:opacity-50"
              >
                <Trash size={14} /> Xoá dòng đã chọn
              </button>
            </>
          )}
          {pendingRow && (
            <>
              <span className="text-xs text-amber-400">Điền giá trị cho dòng mới rồi lưu:</span>
              <button
                onClick={handleSavePendingRow}
                disabled={busy}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-green-600/20 text-green-400 hover:bg-green-600/40 transition disabled:opacity-50"
              >
                <TickCircle size={14} /> Lưu dòng mới
              </button>
              <button
                onClick={handleCancelPendingRow}
                disabled={busy}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-white/5 text-gray-300 hover:bg-white/10 transition disabled:opacity-50"
              >
                <CloseCircle size={14} /> Huỷ
              </button>
            </>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowExportMenu((v) => !v)}
            disabled={rowData.length === 0}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-white/5 text-gray-300 hover:bg-white/10 transition disabled:opacity-50"
          >
            <DocumentDownload size={14} /> Xuất dữ liệu
          </button>
          {showExportMenu && (
            <div className="absolute right-0 mt-1 w-32 bg-[#0A0710] border border-space-border rounded-md shadow-lg z-10 overflow-hidden">
              {(['csv', 'json', 'sql'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => handleExport(fmt)}
                  className="block w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10 uppercase"
                >
                  {fmt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="ag-theme-alpine-dark flex-1">
        <AgGridReact
          ref={gridRef}
          theme="legacy"
          rowData={displayRows}
          columnDefs={columnDefs}
          getRowId={getRowId}
          animateRows={true}
          rowSelection={canEdit ? { mode: 'multiRow' } : undefined}
          onCellValueChanged={onCellValueChanged}
        />
      </div>
    </div>
  );
};
