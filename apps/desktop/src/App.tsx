import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ConnectionModal } from './components/ConnectionModal';
import { EditorPanel } from './components/EditorPanel';
import { DataGrid } from './components/DataGrid';
import { TableDesignerModal } from './components/TableDesignerModal';
import { HistoryPanel } from './components/HistoryPanel';
import { useConnectionStore, useQueryStore, ConnectionProfile } from '@db-client/core';
import { generateCreateTableSql, DesignerColumn } from './lib/ddl';
import { escapeIdentifier } from './lib/sql';
import { TableAction } from './components/DbExplorerTree';

// Safe Tauri invoke wrapper — works in Tauri shell and falls back in browser
async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  // @ts-ignore
  if (window.__TAURI__) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(cmd, args);
  }
  throw new Error('Tauri is not available. Please run with `npm run tauri dev`.');
}

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [activeConnection, setActiveConnection] = useState<ConnectionProfile | null>(null);
  const [dbSessionId, setDbSessionId] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<any[]>([]);
  const [affectedRows, setAffectedRows] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // A connection here maps to a *server* (Navicat-style), not one fixed database: `databases`
  // lists everything visible on that server, `currentDatabase` is whichever one the backend's
  // single pool for this session is actually bound to right now, and `schemaByDb`/
  // `schemaErrorByDb` cache each database's schema client-side once it's been expanded in the
  // tree (so re-expanding a previously-viewed database doesn't need a round trip).
  const [databases, setDatabases] = useState<string[]>([]);
  const [databasesError, setDatabasesError] = useState<string | null>(null);
  const [currentDatabase, setCurrentDatabase] = useState<string | null>(null);
  const [schemaByDb, setSchemaByDb] = useState<Record<string, any>>({});
  const [schemaErrorByDb, setSchemaErrorByDb] = useState<Record<string, string>>({});
  const [loadingDbName, setLoadingDbName] = useState<string | null>(null);

  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [activeTableName, setActiveTableName] = useState<string | null>(null);
  const [editorValue, setEditorValue] = useState('SELECT * FROM users LIMIT 10;');

  // Server-side pagination state for "browse table" views (double-click / "Xem dữ liệu"). Only
  // active while `browseContext` is set — arbitrary hand-typed queries aren't paginated since we
  // can't safely wrap/COUNT an arbitrary SELECT without a real SQL parser.
  const [browseContext, setBrowseContext] = useState<{ dbName: string; tableName: string } | null>(null);
  const [pageSize, setPageSize] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRows, setTotalRows] = useState<number | null>(null);

  const { connections } = useConnectionStore();
  const { addQueryLog } = useQueryStore();

  const schema = currentDatabase ? schemaByDb[currentDatabase] ?? null : null;

  const handleSelectConnection = async (conn: ConnectionProfile) => {
    setIsLoading(true);
    setError(null);
    setQueryResult([]);
    setAffectedRows(null);
    setSchemaByDb({});
    setSchemaErrorByDb({});

    try {
      let connectionString = '';
      if (conn.type === 'sqlite') {
        // SQLite: create a local file next to app
        connectionString = `sqlite://${conn.name}.db?mode=rwc`;
      } else {
        const auth = conn.password ? `${conn.user}:${conn.password}` : conn.user;
        connectionString = `${conn.type}://${auth}@${conn.host}:${conn.port}/${conn.database || ''}`;
      }

      const sessionId = await tauriInvoke<string>('db_connect', {
        dbType: conn.type,
        connectionString,
      });

      setDbSessionId(sessionId);
      setActiveConnection(conn);
      const initialDb = conn.type === 'sqlite' ? conn.name : conn.database || '';
      setCurrentDatabase(initialDb);

      setDatabasesError(null);
      if (conn.type !== 'sqlite') {
        try {
          const dbs = await tauriInvoke<string[]>('db_list_databases', { connectionId: sessionId });
          // Make sure the database we actually connected through is always present, even if
          // it somehow isn't returned by the catalog query (e.g. permissions hide it from the
          // listing on some managed Postgres providers).
          setDatabases(dbs.includes(initialDb) ? dbs : [initialDb, ...dbs]);
        } catch (e: any) {
          setDatabasesError(String(e));
          setDatabases([initialDb]);
        }
      } else {
        setDatabases([initialDb]);
      }

      // Auto-expand the database we just connected through; others stay collapsed until clicked.
      // The pool is already bound to initialDb (that's what we just connect()'d to), so skip
      // the otherwise-redundant switch_database round trip.
      await handleExpandDatabaseFor(sessionId, conn, initialDb, true);
    } catch (err: any) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Ensures the backend pool for this session is actually pointed at `dbName` (Postgres/MySQL
  // bind one database per connection, so "switching" means reconnecting under the hood).
  // No-op for SQLite, where there's only ever one database.
  const ensureDatabase = async (dbName: string): Promise<boolean> => {
    if (!dbSessionId) return false;
    if (currentDatabase === dbName) return true;
    if (activeConnection?.type === 'sqlite') {
      setCurrentDatabase(dbName);
      return true;
    }
    try {
      await tauriInvoke('db_switch_database', { connectionId: dbSessionId, databaseName: dbName });
      setCurrentDatabase(dbName);
      return true;
    } catch (e: any) {
      setSchemaErrorByDb((prev) => ({ ...prev, [dbName]: String(e) }));
      return false;
    }
  };

  // Switches to (if needed) and fetches the schema for `dbName`, caching it. `sessionId`/`conn`
  // are passed explicitly for the very first call right after connect, where the corresponding
  // state hooks haven't committed yet (so `currentDatabase` would still read stale/null).
  // `alreadyConnected` skips the switch when the pool is already known to be bound to `dbName`.
  const handleExpandDatabaseFor = async (
    sessionId: string,
    conn: ConnectionProfile,
    dbName: string,
    alreadyConnected = false
  ) => {
    setLoadingDbName(dbName);
    try {
      if (!alreadyConnected && currentDatabase !== dbName && conn.type !== 'sqlite') {
        await tauriInvoke('db_switch_database', { connectionId: sessionId, databaseName: dbName });
        setCurrentDatabase(dbName);
      }
      const dbSchema = await tauriInvoke('db_get_schema', { connectionId: sessionId });
      setSchemaByDb((prev) => ({ ...prev, [dbName]: dbSchema }));
      setSchemaErrorByDb((prev) => {
        const next = { ...prev };
        delete next[dbName];
        return next;
      });
    } catch (e: any) {
      setSchemaErrorByDb((prev) => ({ ...prev, [dbName]: String(e) }));
    } finally {
      setLoadingDbName(null);
    }
  };

  // Called when the user expands a database node in the tree.
  const handleExpandDatabase = async (dbName: string) => {
    if (!dbSessionId || !activeConnection) return;
    if (schemaByDb[dbName] && currentDatabase === dbName) return; // already loaded and live
    await handleExpandDatabaseFor(dbSessionId, activeConnection, dbName);
  };

  const handleRetryDatabase = (dbName: string) => handleExpandDatabase(dbName);

  // `SELECT * FROM table LIMIT n` with no ORDER BY doesn't guarantee the same row order between
  // calls (in Postgres/MySQL) — re-running it after an edit, or even just re-running it twice in
  // a row, can shuffle rows around with nothing actually changed. Order by the table's primary
  // key when known so "view data" stays stable (and so LIMIT/OFFSET pagination is meaningful at
  // all — without a stable order, page 2 isn't reliably "the next 100 rows after page 1").
  const buildViewQuery = (dbName: string, tableName: string, page = 1, size = pageSize) => {
    const pkCols = (schemaByDb[dbName]?.tables?.find((t: any) => t.name === tableName)?.columns ?? [])
      .filter((c: any) => c.is_primary)
      .map((c: any) => escapeIdentifier(c.name));
    const orderBy = pkCols.length > 0 ? ` ORDER BY ${pkCols.join(', ')}` : '';
    const offset = (page - 1) * size;
    return `SELECT * FROM ${escapeIdentifier(tableName)}${orderBy} LIMIT ${size} OFFSET ${offset}`;
  };

  // Loads a page of a table's data and (on `withCount`) refreshes the total row count used to
  // render page X/Y. Called for the initial "browse this table" action and whenever the page
  // number/size changes.
  const loadTablePage = async (dbName: string, tableName: string, page: number, size: number, withCount: boolean) => {
    const switched = await ensureDatabase(dbName);
    if (!switched) return;
    setBrowseContext({ dbName, tableName });
    setCurrentPage(page);
    const q = buildViewQuery(dbName, tableName, page, size);
    setEditorValue(q);
    await handleExecuteQuery(q, false);

    if (withCount && dbSessionId) {
      try {
        const countResult = await tauriInvoke<{ rows: string[] }>('db_execute_query', {
          connectionId: dbSessionId,
          query: `SELECT COUNT(*) AS cnt FROM ${escapeIdentifier(tableName)}`,
        });
        const countRow = JSON.parse(countResult.rows[0]);
        setTotalRows(Number(countRow.cnt));
      } catch (e) {
        setTotalRows(null);
      }
    }
  };

  const handlePageChange = (newPage: number) => {
    if (!browseContext) return;
    loadTablePage(browseContext.dbName, browseContext.tableName, newPage, pageSize, false);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    if (browseContext) {
      loadTablePage(browseContext.dbName, browseContext.tableName, 1, newSize, false);
    }
  };

  const handleRetryListDatabases = async () => {
    if (!dbSessionId || !activeConnection || activeConnection.type === 'sqlite') return;
    setDatabasesError(null);
    try {
      const dbs = await tauriInvoke<string[]>('db_list_databases', { connectionId: dbSessionId });
      setDatabases(currentDatabase && !dbs.includes(currentDatabase) ? [currentDatabase, ...dbs] : dbs);
    } catch (e: any) {
      setDatabasesError(String(e));
    }
  };

  const handleExecuteQuery = async (query: string, logHistory = true) => {
    if (!dbSessionId) {
      setError('Chọn một kết nối trước khi chạy truy vấn.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await tauriInvoke<{ rows: string[]; affected_rows: number }>('db_execute_query', {
        connectionId: dbSessionId,
        query,
      });

      const parsedRows = result.rows.map((r) => JSON.parse(r));
      setQueryResult(parsedRows);
      setAffectedRows(result.affected_rows);
      setLastQuery(query);
      if (logHistory) {
        addQueryLog(query, dbSessionId);
      }

      // Best-effort single-table detection ("SELECT ... FROM <table> ...") so the grid knows
      // which table/PK to target for inline editing. Joins/subqueries fall back to read-only.
      const singleTableMatch = query.match(/^\s*SELECT\b[\s\S]*?\bFROM\s+["'`]?(\w+)["'`]?\s*(?:WHERE|GROUP|ORDER|LIMIT|;|$)/i);
      const hasJoin = /\bJOIN\b/i.test(query);
      setActiveTableName(singleTableMatch && !hasJoin ? singleTableMatch[1] : null);
    } catch (err: any) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Runs a mutating statement (UPDATE/INSERT/DELETE) issued from the data grid.
  // If `localPatch` is given (plain cell edits), it patches the displayed rows in place —
  // re-running the original SELECT (which has no ORDER BY) doesn't guarantee row order between
  // calls, so blindly refetching after every edit made rows appear to jump around/disappear.
  // Without `localPatch` (add/delete row, where we need the DB's view of new/removed rows
  // anyway), it falls back to re-running the last SELECT.
  const handleMutate = async (sql: string, localPatch?: (rows: any[]) => any[]) => {
    if (!dbSessionId) return;
    try {
      await tauriInvoke('db_execute_query', { connectionId: dbSessionId, query: sql });
    } catch (err: any) {
      setError(String(err));
      return;
    }
    if (localPatch) {
      setQueryResult((prev) => localPatch(prev));
    } else if (lastQuery) {
      await handleExecuteQuery(lastQuery, false);
    }
  };

  const handleDisconnect = async () => {
    if (!dbSessionId) return;
    try {
      await tauriInvoke('db_disconnect', { connectionId: dbSessionId });
    } catch (_) {}
    setDbSessionId(null);
    setActiveConnection(null);
    setSchemaByDb({});
    setSchemaErrorByDb({});
    setDatabases([]);
    setDatabasesError(null);
    setCurrentDatabase(null);
    setQueryResult([]);
    setAffectedRows(null);
    setError(null);
  };

  const handleCreateTable = async (tableName: string, columns: DesignerColumn[]) => {
    if (!dbSessionId || !activeConnection || !currentDatabase) return;

    const sql = generateCreateTableSql(activeConnection.type, tableName, columns);

    setIsTableModalOpen(false);
    await handleExecuteQuery(sql);
    await handleExpandDatabase(currentDatabase);
  };

  // Right-click / double-click actions from the schema explorer tree. Each is scoped to the
  // database the table belongs to — if the user clicks a table under a database that isn't
  // the backend's current pool, this switches first. Drop/rename/truncate use plain
  // identifier-quoted SQL — same trust model as the rest of this MVP (no parameter binding
  // exists yet on the backend).
  const handleTableAction = async (dbName: string, action: TableAction, tableName: string) => {
    if (!dbSessionId || !activeConnection) return;
    const switched = await ensureDatabase(dbName);
    if (!switched) return;
    const ident = escapeIdentifier(tableName);

    if (action === 'view') {
      await loadTablePage(dbName, tableName, 1, pageSize, true);
      return;
    }

    if (action === 'refresh') {
      await handleExpandDatabase(dbName);
      return;
    }

    if (action === 'rename') {
      const newName = window.prompt(`Đổi tên bảng "${tableName}" thành:`, tableName);
      if (!newName || newName === tableName) return;
      await tauriInvoke('db_execute_query', {
        connectionId: dbSessionId,
        query: `ALTER TABLE ${ident} RENAME TO ${escapeIdentifier(newName)}`,
      }).catch((err) => setError(String(err)));
      await handleExpandDatabase(dbName);
      return;
    }

    if (action === 'truncate') {
      if (!window.confirm(`Xoá toàn bộ dữ liệu trong bảng "${tableName}"? Hành động này không thể hoàn tác.`)) return;
      // SQLite has no TRUNCATE statement.
      const sql = activeConnection.type === 'sqlite' ? `DELETE FROM ${ident}` : `TRUNCATE TABLE ${ident}`;
      await tauriInvoke('db_execute_query', { connectionId: dbSessionId, query: sql }).catch((err) => setError(String(err)));
      if (activeTableName === tableName) await handleExecuteQuery(lastQuery ?? buildViewQuery(dbName, tableName), false);
      return;
    }

    if (action === 'drop') {
      if (!window.confirm(`Xoá hẳn bảng "${tableName}"? Hành động này không thể hoàn tác.`)) return;
      await tauriInvoke('db_execute_query', { connectionId: dbSessionId, query: `DROP TABLE ${ident}` }).catch((err) =>
        setError(String(err))
      );
      if (activeTableName === tableName) {
        setActiveTableName(null);
        setQueryResult([]);
      }
      await handleExpandDatabase(dbName);
      return;
    }
  };

  const handleTableDoubleClick = async (dbName: string, tableName: string) => {
    const switched = await ensureDatabase(dbName);
    if (!switched) return;
    const q = buildViewQuery(dbName, tableName);
    setEditorValue(q);
    await handleExecuteQuery(q);
  };

  return (
    <div className="flex h-screen w-screen bg-space-bg text-white overflow-hidden">
      <Sidebar
        onOpenAddModal={() => setIsModalOpen(true)}
        onSelectConnection={handleSelectConnection}
        activeConnectionId={activeConnection?.id ?? null}
        databases={databases}
        databasesError={databasesError}
        onRetryListDatabases={handleRetryListDatabases}
        currentDatabase={currentDatabase}
        schemaByDb={schemaByDb}
        schemaErrorByDb={schemaErrorByDb}
        loadingDbName={loadingDbName}
        onExpandDatabase={handleExpandDatabase}
        onRetryDatabase={handleRetryDatabase}
        onTableDoubleClick={handleTableDoubleClick}
        onTableAction={handleTableAction}
      />

      <div className="flex-1 flex flex-col h-full">
        {/* Top bar */}
        {activeConnection && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-space-border bg-[#0A0710]">
            <span className="text-xs text-gray-400">
              Đang kết nối: <span className="text-indigo-400 font-semibold">{activeConnection.name}</span>
              <span className="text-gray-600 ml-2">({activeConnection.type})</span>
              {currentDatabase && <span className="text-sky-400 ml-2">/ {currentDatabase}</span>}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsTableModalOpen(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition"
              >
                + Tạo Bảng Mới
              </button>
              <button
                onClick={handleDisconnect}
                className="text-xs text-red-400 hover:text-red-300 transition border-l border-space-border pl-3"
              >
                Ngắt kết nối
              </button>
            </div>
          </div>
        )}

        {!activeConnection ? (
          <div className="flex-1 flex flex-col justify-center items-center gap-4">
            <div className="text-4xl">🗄️</div>
            <p className="text-gray-400 text-sm">
              {connections.length === 0
                ? 'Nhấn "+" ở thanh bên để thêm kết nối đầu tiên.'
                : 'Chọn một kết nối từ thanh bên để bắt đầu.'}
            </p>
            {isLoading && <p className="text-indigo-400 text-sm animate-pulse">Đang kết nối...</p>}
            {error && (
              <div className="bg-red-900/20 text-red-400 px-4 py-3 rounded-lg text-sm border border-red-900/40 max-w-md text-center">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* SQL Editor (top 40%) */}
              <div className="h-[40%] min-h-[160px]">
                <EditorPanel
                  value={editorValue}
                  onChange={setEditorValue}
                  onExecute={handleExecuteQuery}
                  isLoading={isLoading}
                  schema={schema}
                />
              </div>

              {/* Result area (bottom 60%) */}
              <div className="flex-1 bg-[#05030A] p-2 flex flex-col overflow-hidden">
                {error && (
                  <div className="bg-red-900/20 text-red-400 p-3 mb-2 rounded-lg text-sm border border-red-900/50 flex-shrink-0">
                    {error}
                  </div>
                )}
                {affectedRows !== null && queryResult.length === 0 && !error && (
                  <div className="text-green-400 p-3 text-sm flex-shrink-0">
                    ✓ Lệnh thực thi thành công. Hàng bị ảnh hưởng: {affectedRows}
                  </div>
                )}
                <div className="flex-1 rounded-xl overflow-hidden border border-space-border">
                  <DataGrid
                    rowData={queryResult}
                    tableName={activeTableName}
                    tableColumns={schema?.tables?.find((t: any) => t.name === activeTableName)?.columns ?? null}
                    onMutate={handleMutate}
                  />
                </div>
              </div>
            </div>

            <HistoryPanel connectionId={dbSessionId} onLoadQuery={setEditorValue} />
          </div>
        )}
      </div>

      <ConnectionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <TableDesignerModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        onSave={handleCreateTable}
        schema={schema}
      />
    </div>
  );
}

export default App;
