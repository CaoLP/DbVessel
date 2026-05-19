# Expo Mobile MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện ứng dụng Mobile bằng Expo, cấu hình Expo Native Module làm cầu nối gọi thư viện lõi `shared-rust` thông qua UniFFI, và xây dựng giao diện truy vấn với CodeMirror, FlashList.

**Architecture:** Sử dụng Expo Local Modules. Lõi `shared-rust` sẽ được biên dịch chéo (cross-compile) thành thư viện tĩnh (static library) cho iOS và Android. Mã nguồn Swift và Kotlin sẽ được sinh tự động bằng UniFFI và bọc lại bởi Expo Module API để export ra JavaScript/TypeScript.

**Tech Stack:** Expo SDK, React Native, Rust, UniFFI, Swift, Kotlin, CodeMirror, Shopify FlashList.

---

### Task 1: Khởi tạo Expo Local Module (db-native)

**Files:**
- Create: `apps/mobile/modules/db-native/package.json`
- Create: `apps/mobile/modules/db-native/index.ts`
- Modify: `apps/mobile/package.json`

- [x] **Step 1: Khởi tạo thư mục và package.json cho module**

Tạo `apps/mobile/modules/db-native/package.json`:

```json
{
  "name": "db-native",
  "version": "0.1.0",
  "description": "Native DB bindings",
  "main": "index.ts",
  "dependencies": {},
  "peerDependencies": {
    "expo": "*"
  }
}
```

- [x] **Step 2: Tạo file index.ts của module**

Tạo `apps/mobile/modules/db-native/index.ts`:

```typescript
import { NativeModulesProxy } from 'expo-modules-core';

// For now, this is a mock implementation until native code is fully hooked up.
export async function connect(dbType: string, connectionString: string): Promise<string> {
    return "mock-mobile-id";
}

export async function disconnect(connectionId: string): Promise<void> {
    return;
}

export async function executeQuery(connectionId: string, query: string): Promise<{rows: string[], affected_rows: number}> {
    return { rows: [], affected_rows: 0 };
}
```

- [x] **Step 3: Cập nhật package.json của Mobile App**

Thêm `db-native` vào `dependencies` trong `apps/mobile/package.json`:

```json
  "dependencies": {
    "db-native": "./modules/db-native",
    ...
```

- [x] **Step 4: Cài đặt dependencies**

Chạy lệnh: `cd apps/mobile && npm install`
Expected: Cài đặt thành công module cục bộ.

- [x] **Step 5: Commit**

```bash
git add apps/mobile/modules apps/mobile/package.json apps/mobile/package-lock.json
git commit -m "feat: init expo local module db-native"
```

---

### Task 2: Cài đặt Frontend Dependencies cho Mobile

**Files:**
- Modify: `apps/mobile/package.json`

- [x] **Step 1: Cài đặt thư viện UI**

Chạy lệnh từ thư mục `apps/mobile`:
```bash
cd apps/mobile
npm install @shopify/flash-list @uiw/react-codemirror @codemirror/lang-sql iconsax-react-native
```

*(Lưu ý: `@uiw/react-codemirror` chủ yếu cho web, nhưng trong Expo nó có thể chạy trên web hoặc cần native wrapper. Để đơn giản cho MVP, ta sẽ cài đặt và sử dụng nó cơ bản, có thể fallback sang `TextInput` nếu lỗi native).*

- [x] **Step 2: Cài đặt Zustand từ packages/core**

Đảm bảo `@db-client/core` đã được link (đã thực hiện từ trước).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/package.json apps/mobile/package-lock.json
git commit -m "chore: install flash-list and codemirror for mobile ui"
```

---

### Task 3: Xây dựng Component Mobile DataGrid & Editor

**Files:**
- Create: `apps/mobile/src/components/MobileDataGrid.tsx`
- Create: `apps/mobile/src/components/MobileEditor.tsx`

- [ ] **Step 1: Tạo MobileDataGrid Component**

Tạo `apps/mobile/src/components/MobileDataGrid.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';

interface MobileDataGridProps {
  rowData: any[];
}

export const MobileDataGrid: React.FC<MobileDataGridProps> = ({ rowData }) => {
  if (rowData.length === 0) return <Text className="text-gray-400 p-4">No data</Text>;

  const columns = Object.keys(rowData[0]);

  const renderItem = ({ item }: { item: any }) => (
    <View className="border-b border-gray-800 p-3 bg-gray-900/50 rounded-lg mb-2">
      {columns.map(col => (
        <View key={col} className="flex-row justify-between mb-1">
          <Text className="text-gray-400 text-xs font-bold">{col}</Text>
          <Text className="text-white text-sm">{String(item[col])}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View className="flex-1 w-full p-2">
      <FlashList
        data={rowData}
        renderItem={renderItem}
        estimatedItemSize={100}
      />
    </View>
  );
};
```

- [ ] **Step 2: Tạo MobileEditor Component**

Tạo `apps/mobile/src/components/MobileEditor.tsx`:

```tsx
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { Play } from 'iconsax-react-native';

interface MobileEditorProps {
  onExecute: (query: string) => void;
  isLoading: boolean;
}

export const MobileEditor: React.FC<MobileEditorProps> = ({ onExecute, isLoading }) => {
  const [query, setQuery] = useState('SELECT * FROM users LIMIT 10;');

  return (
    <View className="flex-1 bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
      <View className="flex-row justify-between items-center bg-black px-4 py-2 border-b border-gray-800">
        <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider">SQL Editor</Text>
        <TouchableOpacity 
          onPress={() => onExecute(query)}
          disabled={isLoading}
          className="flex-row items-center bg-green-900/40 px-3 py-1.5 rounded-lg"
        >
          <Play size={16} color="#4ade80" variant="Bold" />
          <Text className="text-green-400 font-bold ml-1 text-xs">Run</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        className="flex-1 text-white p-4 font-mono text-sm"
        multiline
        value={query}
        onChangeText={setQuery}
        textAlignVertical="top"
        placeholder="Enter SQL Query..."
        placeholderTextColor="#666"
      />
    </View>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/
git commit -m "feat: implement MobileDataGrid and MobileEditor components"
```

---

### Task 4: Tích hợp Frontend gọi Module Native

**Files:**
- Modify: `apps/mobile/app/index.tsx`

- [ ] **Step 1: Sửa trang chủ App Mobile**

Thay thế nội dung `apps/mobile/app/index.tsx`:

```tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useConnectionStore } from '@db-client/core';
import { MobileEditor } from '../src/components/MobileEditor';
import { MobileDataGrid } from '../src/components/MobileDataGrid';
import { connect, executeQuery } from 'db-native';

export default function App() {
  const { connections } = useConnectionStore();
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [dbSessionId, setDbSessionId] = useState<string | null>(null);
  
  const [queryResult, setQueryResult] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectConnection = async (connId: string) => {
    const conn = connections.find(c => c.id === connId);
    if (!conn) return;
    
    setIsLoading(true);
    setError(null);
    try {
      let connectionString = conn.type === 'sqlite' 
        ? `sqlite://${conn.name}.db?mode=rwc` 
        : `${conn.type}://${conn.user}@${conn.host}:${conn.port}`;
      
      const sessionId = await connect(conn.type, connectionString);
      setDbSessionId(sessionId);
      setActiveConnectionId(connId);
      setQueryResult([]);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteQuery = async (query: string) => {
    if (!dbSessionId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const result = await executeQuery(dbSessionId, query);
      const parsedRows = result.rows.map(r => JSON.parse(r));
      setQueryResult(parsedRows);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 p-4">
        {!activeConnectionId ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-white text-lg font-bold mb-6">Select Connection</Text>
            {connections.map(c => (
              <TouchableOpacity
                key={c.id}
                onPress={() => handleSelectConnection(c.id)}
                className="bg-indigo-600 px-6 py-3 rounded-xl mb-4 w-full"
              >
                <Text className="text-white text-center font-bold text-base">{c.name}</Text>
              </TouchableOpacity>
            ))}
            {isLoading && <ActivityIndicator color="#6366f1" style={{ marginTop: 20 }} />}
            {error && <Text className="text-red-400 mt-4">{error}</Text>}
          </View>
        ) : (
          <View className="flex-1">
            <View className="h-1/3 mb-4">
              <MobileEditor onExecute={handleExecuteQuery} isLoading={isLoading} />
            </View>
            <View className="flex-1 bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
              {error && <Text className="text-red-400 p-4">{error}</Text>}
              <MobileDataGrid rowData={queryResult} />
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/index.tsx
git commit -m "feat: integrate db-native logic into mobile ui"
```

---
