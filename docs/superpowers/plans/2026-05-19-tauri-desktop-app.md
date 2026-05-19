# Tauri Desktop MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện ứng dụng Desktop bằng cách bọc giao diện React hiện tại vào Tauri, thiết lập Tauri IPC kết nối với thư viện lõi `shared-rust`, và xây dựng giao diện truy vấn với Monaco Editor và AG Grid.

**Architecture:** Sử dụng kiến trúc Tauri v2. Giao diện (React + Vite) sẽ gửi lệnh qua Tauri IPC (`@tauri-apps/api`). Backend của Tauri (Rust) sẽ trực tiếp gọi các hàm của `shared-rust` (thông qua local path dependency) để giao tiếp với cơ sở dữ liệu.

**Tech Stack:** Tauri v2, Rust, React, Monaco Editor, AG Grid.

---

### Task 1: Thiết lập cấu hình Tauri (src-tauri)

**Files:**
- Create: `apps/desktop/src-tauri/Cargo.toml`
- Create: `apps/desktop/src-tauri/tauri.conf.json`
- Create: `apps/desktop/src-tauri/src/main.rs`
- Modify: `apps/desktop/package.json`

- [x] **Step 1: Khởi tạo Cargo.toml cho Tauri**

Tạo `apps/desktop/src-tauri/Cargo.toml`:

```toml
[package]
name = "dataviewer-desktop"
version = "0.1.0"
description = "A Tauri App"
authors = ["you"]
edition = "2021"

[build-dependencies]
tauri-build = { version = "2.0.0", features = [] }

[dependencies]
tauri = { version = "2.0.0", features = [] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
shared-rust = { path = "../../../packages/shared-rust" }
```

- [x] **Step 2: Cấu hình tauri.conf.json**

Tạo `apps/desktop/src-tauri/tauri.conf.json`:

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:3000",
    "frontendDist": "../dist"
  },
  "app": {
    "withGlobalTauri": true,
    "windows": [
      {
        "title": "DbVessel Desktop",
        "width": 1200,
        "height": 800,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "identifier": "com.dbvessel.desktop",
    "targets": "all"
  }
}
```

- [x] **Step 3: Tạo mã nguồn khởi chạy Tauri**

Tạo `apps/desktop/src-tauri/src/main.rs`:

```rust
// Prevents additional console window on Windows in release
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [x] **Step 4: Cập nhật package.json của Desktop**

Sửa `apps/desktop/package.json` để thêm Tauri CLI và scripts:

Chạy lệnh: `cd apps/desktop && npm install @tauri-apps/cli @tauri-apps/api@2`

Sửa `scripts` trong `apps/desktop/package.json` để thêm `tauri`:
```json
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "tauri": "tauri"
  }
```

- [x] **Step 5: Commit**

```bash
git add apps/desktop/src-tauri apps/desktop/package.json apps/desktop/package-lock.json
git commit -m "feat: initialize tauri configuration for desktop app"
```

---

### Task 2: Tauri IPC Commands (Rust Bridge)

**Files:**
- Modify: `apps/desktop/src-tauri/src/main.rs`

- [x] **Step 1: Đăng ký các Tauri Commands gọi shared-rust**

Sửa `apps/desktop/src-tauri/src/main.rs`:

```rust
// Prevents additional console window on Windows in release
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use shared_rust::{connect, disconnect, execute_query, QueryResult, DbError};

#[tauri::command]
fn db_connect(db_type: String, connection_string: String) -> Result<String, String> {
    connect(db_type, connection_string).map_err(|e| match e {
        DbError::Generic { message } => message,
    })
}

#[tauri::command]
fn db_disconnect(connection_id: String) -> Result<(), String> {
    disconnect(connection_id).map_err(|e| match e {
        DbError::Generic { message } => message,
    })
}

#[tauri::command]
fn db_execute_query(connection_id: String, query: String) -> Result<QueryResult, String> {
    execute_query(connection_id, query).map_err(|e| match e {
        DbError::Generic { message } => message,
    })
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![db_connect, db_disconnect, db_execute_query])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [x] **Step 2: Build kiểm tra**

Chạy: `cd apps/desktop/src-tauri && cargo check`
Expected: Check passes (Tauri context generated successfully).

- [x] **Step 3: Commit**

```bash
git add apps/desktop/src-tauri/src/main.rs
git commit -m "feat: setup tauri ipc commands delegating to shared-rust core"
```

---

### Task 3: Cài đặt Frontend Dependencies (Monaco & AG Grid)

**Files:**
- Modify: `apps/desktop/package.json`

- [x] **Step 1: Cài đặt thư viện Editor và Grid**

Chạy lệnh cài đặt từ thư mục `apps/desktop`:
```bash
cd apps/desktop
npm install @monaco-editor/react ag-grid-react ag-grid-community
```

- [x] **Step 2: Commit**

```bash
git add apps/desktop/package.json apps/desktop/package-lock.json
git commit -m "chore: install monaco-editor and ag-grid dependencies for desktop ui"
```

---

### Task 4: Xây dựng Component EditorPanel & DataGrid

**Files:**
- Create: `apps/desktop/src/components/EditorPanel.tsx`
- Create: `apps/desktop/src/components/DataGrid.tsx`

- [ ] **Step 1: Tạo DataGrid Component**

Tạo `apps/desktop/src/components/DataGrid.tsx`:

```tsx
import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

interface DataGridProps {
  rowData: any[];
}

export const DataGrid: React.FC<DataGridProps> = ({ rowData }) => {
  const columnDefs = useMemo(() => {
    if (rowData.length === 0) return [];
    return Object.keys(rowData[0]).map(key => ({
      field: key,
      sortable: true,
      filter: true,
      resizable: true,
    }));
  }, [rowData]);

  return (
    <div className="ag-theme-alpine-dark w-full h-full">
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        animateRows={true}
      />
    </div>
  );
};
```

- [ ] **Step 2: Tạo EditorPanel Component**

Tạo `apps/desktop/src/components/EditorPanel.tsx`:

```tsx
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
```

- [ ] **Step 3: Thêm style tuỳ chỉnh cho Grid**

Thêm đoạn CSS sau vào cuối file `apps/desktop/src/index.css`:

```css
.ag-theme-alpine-dark {
  --ag-background-color: transparent !important;
  --ag-header-background-color: #0A0710 !important;
  --ag-odd-row-background-color: rgba(255,255,255,0.02) !important;
  --ag-border-color: rgba(255,255,255,0.08) !important;
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/components/ apps/desktop/src/index.css
git commit -m "feat: implement EditorPanel with monaco and DataGrid with ag-grid"
```

---

### Task 5: Tích hợp Frontend gọi Tauri IPC

**Files:**
- Modify: `apps/desktop/src/App.tsx`

- [ ] **Step 1: Sửa App.tsx để thực thi lệnh qua Tauri**

Thay thế nội dung `apps/desktop/src/App.tsx`:

```tsx
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Sidebar } from './components/Sidebar';
import { ConnectionModal } from './components/ConnectionModal';
import { EditorPanel } from './components/EditorPanel';
import { DataGrid } from './components/DataGrid';
import { useConnectionStore } from '@db-client/core';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [dbSessionId, setDbSessionId] = useState<string | null>(null);
  
  const [queryResult, setQueryResult] = useState<any[]>([]);
  const [affectedRows, setAffectedRows] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { connections } = useConnectionStore();

  const handleSelectConnection = async (connId: string) => {
    const conn = connections.find(c => c.id === connId);
    if (!conn) return;
    
    setIsLoading(true);
    setError(null);
    try {
      // Build dummy connection string for SQLite for MVP, or full for Postgres
      let connectionString = '';
      if (conn.type === 'sqlite') {
        connectionString = `sqlite://${conn.name}.db?mode=rwc`;
      } else {
        connectionString = `${conn.type}://${conn.user}@${conn.host}:${conn.port}`;
      }
      
      const sessionId: string = await invoke('db_connect', { 
        dbType: conn.type, 
        connectionString 
      });
      setDbSessionId(sessionId);
      setActiveConnectionId(connId);
      setQueryResult([]);
      setAffectedRows(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteQuery = async (query: string) => {
    if (!dbSessionId) {
      setError('Please select a connection first.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const result: { rows: string[], affected_rows: number } = await invoke('db_execute_query', {
        connectionId: dbSessionId,
        query
      });
      
      // Parse JSON rows
      const parsedRows = result.rows.map(r => JSON.parse(r));
      setQueryResult(parsedRows);
      setAffectedRows(result.affected_rows);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-space-bg text-white overflow-hidden">
      <Sidebar onOpenAddModal={() => setIsModalOpen(true)} />
      
      <div className="flex-1 flex flex-col h-full">
        {!activeConnectionId ? (
          <div className="flex-1 flex flex-col justify-center items-center">
             <p className="text-gray-400 mb-4">Chọn hoặc thêm kết nối từ thanh bên để bắt đầu thao tác.</p>
             <div className="flex gap-2">
               {connections.map(c => (
                 <button 
                   key={c.id} 
                   onClick={() => handleSelectConnection(c.id)}
                   className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold transition"
                 >
                   Connect to {c.name}
                 </button>
               ))}
             </div>
             {error && <p className="text-red-400 mt-4 text-sm bg-red-900/20 p-3 rounded">{error}</p>}
             {isLoading && <p className="text-indigo-400 mt-4 text-sm">Connecting...</p>}
          </div>
        ) : (
          <>
            <div className="h-[40%] min-h-[200px]">
              <EditorPanel onExecute={handleExecuteQuery} isLoading={isLoading} />
            </div>
            <div className="h-[60%] bg-[#05030A] p-2 flex flex-col">
              {error && (
                <div className="bg-red-900/20 text-red-400 p-3 mb-2 rounded-lg text-sm border border-red-900/50">
                  {error}
                </div>
              )}
              {affectedRows !== null && queryResult.length === 0 && !error && (
                <div className="text-green-400 p-3 text-sm">
                  Query executed successfully. Affected rows: {affectedRows}
                </div>
              )}
              <div className="flex-1 rounded-xl overflow-hidden border border-space-border">
                <DataGrid rowData={queryResult} />
              </div>
            </div>
          </>
        )}
      </div>
      
      <ConnectionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/App.tsx
git commit -m "feat: integrate tauri ipc with monaco and ag-grid in desktop ui"
```

---
