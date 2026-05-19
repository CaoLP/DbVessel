# Monorepo Foundation & Core Stores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khởi tạo cấu trúc Turborepo Monorepo mới và triển khai các Zustand stores (connections, queries, AI settings) trong package `core` với đầy đủ Unit Test.

**Architecture:** Sử dụng Turborepo làm Monorepo manager, NPM Workspaces để liên kết các apps và packages. Package `core` là một package TypeScript độc lập cung cấp các State Stores (Zustand) và logic nghiệp vụ chạy được trên cả Node, browser (Tauri) và React Native.

**Tech Stack:** Turborepo, NPM Workspaces, TypeScript, Zustand, Vitest (cho unit test).

---

## Danh mục Files thiết lập mới

```text
db-client-monorepo/
├── package.json
├── turbo.json
├── tsconfig.json
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── store/
│   │   │       ├── connectionStore.ts
│   │   │       ├── queryStore.ts
│   │   │       └── aiStore.ts
│   │   └── tests/
│   │       ├── connectionStore.test.ts
│   │       ├── queryStore.test.ts
│   │       └── aiStore.test.ts
│   └── ui/
│       └── package.json (scaffold)
└── apps/
    ├── desktop/
    │   └── package.json (scaffold)
    └── mobile/
        └── package.json (scaffold)
```

---

## Các nhiệm vụ chi tiết (Tasks)

### Task 1: Monorepo Scaffolding & Turborepo Setup

**Files:**
- Create: `package.json` (root)
- Create: `turbo.json` (root)
- Create: `tsconfig.json` (root)

- [x] **Step 1: Tạo file cấu hình root `package.json`**

Tạo file `package.json` định nghĩa các workspaces cho apps và packages:

```json
{
  "name": "db-client-monorepo",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [x] **Step 2: Tạo file cấu hình `turbo.json`**

Tạo file cấu hình chạy các task đồng thời:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": []
    }
  }
}
```

- [x] **Step 3: Tạo file cấu hình `tsconfig.json` gốc**

Tạo cấu hình TypeScript cơ sở:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

- [x] **Step 4: Tạo cấu trúc các thư mục rỗng và scaffold**

Tạo các thư mục: `apps/desktop`, `apps/mobile`, `packages/core`, `packages/ui` và các file `package.json` scaffold cho các app để npm workspace nhận diện:

```bash
mkdir -p apps/desktop apps/mobile packages/core packages/ui
```

Tạo file `packages/ui/package.json`:
```json
{
  "name": "@db-client/ui",
  "version": "0.1.0",
  "private": true
}
```

Tạo file `apps/desktop/package.json`:
```json
{
  "name": "@db-client/desktop",
  "version": "0.1.0",
  "private": true
}
```

Tạo file `apps/mobile/package.json`:
```json
{
  "name": "@db-client/mobile",
  "version": "0.1.0",
  "private": true
}
```

- [x] **Step 5: Thực hiện lệnh cài đặt dependencies đầu tiên**

Chạy command để liên kết các workspace:
Run: `npm install`
Expected: Tạo thư mục node_modules gốc thành công.

---

### Task 2: Core Package Setup & Test Harness

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`

- [x] **Step 1: Tạo `packages/core/package.json`**

Khai báo package core sử dụng Zustand và cài đặt Vitest cho unit test:

```json
{
  "name": "@db-client/core",
  "version": "0.1.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "vitest": "^1.6.0",
    "typescript": "^5.0.0"
  }
}
```

- [x] **Step 2: Tạo `packages/core/tsconfig.json`**

Cấu hình tsconfig cho package `core`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

- [x] **Step 3: Tạo `packages/core/src/index.ts`**

Tạo entrypoint export ban đầu:

```typescript
export const CORE_VERSION = "0.1.0";
```

- [x] **Step 4: Chạy cài đặt và build thử**

Run: `npm install && npm run build`
Expected: TypeScript biên dịch package core thành công, sinh ra thư mục `packages/core/dist`.

---

### Task 3: Implement connectionStore (Zustand)

**Files:**
- Create: `packages/core/src/store/connectionStore.ts`
- Create: `packages/core/tests/connectionStore.test.ts`
- Modify: `packages/core/src/index.ts`

- [x] **Step 1: Viết test kiểm thử `connectionStore`**

Tạo file `packages/core/tests/connectionStore.test.ts` kiểm thử việc thêm, sửa, xóa Connection Profile:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useConnectionStore } from '../src/store/connectionStore';

describe('connectionStore', () => {
  beforeEach(() => {
    useConnectionStore.getState().clearConnections();
  });

  it('nên thêm mới connection profile thành công', () => {
    const store = useConnectionStore.getState();
    const newProfile = {
      id: 'conn-1',
      name: 'Local Postgres',
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      database: 'my_db',
      type: 'postgres' as const
    };

    store.addConnection(newProfile);
    expect(useConnectionStore.getState().connections).toHaveLength(1);
    expect(useConnectionStore.getState().connections[0].name).toBe('Local Postgres');
  });

  it('nên xóa connection profile thành công', () => {
    const store = useConnectionStore.getState();
    store.addConnection({
      id: 'conn-1',
      name: 'Local Postgres',
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      database: 'my_db',
      type: 'postgres'
    });
    
    store.removeConnection('conn-1');
    expect(useConnectionStore.getState().connections).toHaveLength(0);
  });
});
```

- [x] **Step 2: Chạy test và xác nhận thất bại**

Run: `npm run test` (hoặc `npx vitest run packages/core/tests/connectionStore.test.ts`)
Expected: FAIL do chưa khai báo `useConnectionStore`.

- [x] **Step 3: Hiện thực hóa `connectionStore.ts`**

Tạo file `packages/core/src/store/connectionStore.ts`:

```typescript
import { create } from 'zustand';

export interface ConnectionProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  database?: string;
  type: 'postgres' | 'mysql' | 'sqlite' | 'mssql' | 'oracle' | 'mongodb' | 'redis';
}

interface ConnectionState {
  connections: ConnectionProfile[];
  addConnection: (conn: ConnectionProfile) => void;
  removeConnection: (id: string) => void;
  clearConnections: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  connections: [],
  addConnection: (conn) => set((state) => ({
    connections: [...state.connections, conn]
  })),
  removeConnection: (id) => set((state) => ({
    connections: state.connections.filter((c) => c.id !== id)
  })),
  clearConnections: () => set({ connections: [] })
}));
```

Cập nhật `packages/core/src/index.ts` để export store mới:
```typescript
export * from './store/connectionStore';
```

- [x] **Step 4: Chạy lại test xác nhận vượt qua**

Run: `npx vitest run packages/core/tests/connectionStore.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add packages/core/src/store/connectionStore.ts packages/core/tests/connectionStore.test.ts packages/core/src/index.ts
git commit -m "feat: implement connectionStore with unit tests"
```

---

### Task 4: Implement queryStore (Zustand)

**Files:**
- Create: `packages/core/src/store/queryStore.ts`
- Create: `packages/core/tests/queryStore.test.ts`
- Modify: `packages/core/src/index.ts`

- [x] **Step 1: Viết test cho `queryStore`**

Tạo file `packages/core/tests/queryStore.test.ts` kiểm thử lịch sử SQL query và lưu trữ snippet:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useQueryStore } from '../src/store/queryStore';

describe('queryStore', () => {
  beforeEach(() => {
    useQueryStore.getState().clearHistory();
    useQueryStore.getState().clearSnippets();
  });

  it('nên lưu lịch sử câu lệnh SQL chạy gần nhất', () => {
    const store = useQueryStore.getState();
    store.addQueryLog('SELECT * FROM users;', 'conn-1');
    expect(useQueryStore.getState().history).toHaveLength(1);
    expect(useQueryStore.getState().history[0].sql).toBe('SELECT * FROM users;');
  });

  it('nên giới hạn số lượng lịch sử tối đa là 500 bản ghi', () => {
    const store = useQueryStore.getState();
    for (let i = 0; i < 505; i++) {
      store.addQueryLog(`SELECT ${i};`, 'conn-1');
    }
    expect(useQueryStore.getState().history).toHaveLength(500);
    expect(useQueryStore.getState().history[0].sql).toBe('SELECT 504;');
  });
});
```

- [x] **Step 2: Chạy test và xác nhận thất bại**

Run: `npx vitest run packages/core/tests/queryStore.test.ts`
Expected: FAIL do chưa khai báo `useQueryStore`.

- [x] **Step 3: Hiện thực hóa `queryStore.ts`**

Tạo file `packages/core/src/store/queryStore.ts`:

```typescript
import { create } from 'zustand';

export interface QueryLog {
  id: string;
  sql: string;
  connectionId: string;
  timestamp: number;
}

export interface SQLSnippet {
  id: string;
  name: string;
  sql: string;
}

interface QueryState {
  history: QueryLog[];
  snippets: SQLSnippet[];
  addQueryLog: (sql: string, connectionId: string) => void;
  clearHistory: () => void;
  addSnippet: (snippet: SQLSnippet) => void;
  clearSnippets: () => void;
}

export const useQueryStore = create<QueryState>((set) => ({
  history: [],
  snippets: [],
  addQueryLog: (sql, connectionId) => set((state) => {
    const newLog: QueryLog = {
      id: Math.random().toString(36).substring(7),
      sql,
      connectionId,
      timestamp: Date.now()
    };
    const updatedHistory = [newLog, ...state.history];
    if (updatedHistory.length > 500) {
      updatedHistory.pop();
    }
    return { history: updatedHistory };
  }),
  clearHistory: () => set({ history: [] }),
  addSnippet: (snippet) => set((state) => ({
    snippets: [...state.snippets, snippet]
  })),
  clearSnippets: () => set({ snippets: [] })
}));
```

Cập nhật `packages/core/src/index.ts` để export:
```typescript
export * from './store/queryStore';
```

- [x] **Step 4: Chạy test xác nhận vượt qua**

Run: `npx vitest run packages/core/tests/queryStore.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add packages/core/src/store/queryStore.ts packages/core/tests/queryStore.test.ts packages/core/src/index.ts
git commit -m "feat: implement queryStore with unit tests"
```

---

### Task 5: Implement aiStore (Zustand)

**Files:**
- Create: `packages/core/src/store/aiStore.ts`
- Create: `packages/core/tests/aiStore.test.ts`
- Modify: `packages/core/src/index.ts`

- [x] **Step 1: Viết test cho `aiStore`**

Tạo file `packages/core/tests/aiStore.test.ts` kiểm thử các cài đặt AI:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useAIStore } from '../src/store/aiStore';

describe('aiStore', () => {
  beforeEach(() => {
    useAIStore.getState().clearConfig();
  });

  it('nên cập nhật config AI thành công', () => {
    const store = useAIStore.getState();
    store.setAIConfig({
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      temperature: 0.5
    });

    expect(useAIStore.getState().provider).toBe('gemini');
    expect(useAIStore.getState().model).toBe('gemini-1.5-flash');
    expect(useAIStore.getState().temperature).toBe(0.5);
  });
});
```

- [x] **Step 2: Chạy test và xác nhận thất bại**

Run: `npx vitest run packages/core/tests/aiStore.test.ts`
Expected: FAIL.

- [x] **Step 3: Hiện thực hóa `aiStore.ts`**

Tạo file `packages/core/src/store/aiStore.ts`:

```typescript
import { create } from 'zustand';

interface AIState {
  provider: 'openai' | 'anthropic' | 'gemini' | 'ollama';
  model: string;
  temperature: number;
  setAIConfig: (config: Partial<Pick<AIState, 'provider' | 'model' | 'temperature'>>) => void;
  clearConfig: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  provider: 'openai',
  model: 'gpt-4o-mini',
  temperature: 0.2,
  setAIConfig: (config) => set((state) => ({ ...state, ...config })),
  clearConfig: () => set({
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.2
  })
}));
```

Cập nhật `packages/core/src/index.ts` để export:
```typescript
export * from './store/aiStore';
```

- [x] **Step 4: Chạy test xác nhận vượt qua**

Run: `npx vitest run packages/core/tests/aiStore.test.ts`
Expected: PASS.

- [x] **Step 5: Commit & Kết thúc**

```bash
git add packages/core/src/store/aiStore.ts packages/core/tests/aiStore.test.ts packages/core/src/index.ts
git commit -m "feat: implement aiStore with unit tests"
```
