# Shared Rust Core Database Connection Driver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khởi tạo thư viện Rust core `packages/shared-rust`, tích hợp các driver `sqlx` (PostgreSQL, MySQL, SQLite), `mongodb` để thực thi truy vấn và thiết lập UniFFI bindings.

**Architecture:** Package `shared-rust` hoạt động như một động cơ kết nối cơ sở dữ liệu. Nó lưu trữ các connection pools bằng `dashmap` trong bộ nhớ toàn cục và xuất ra API đơn giản dạng FFI để Mobile và Desktop gọi trực tiếp.

**Tech Stack:** Rust, sqlx (postgres, mysql, sqlite), mongodb, serde_json, uniffi.

---

## Danh mục Files thiết lập mới
```text
packages/shared-rust/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── connection.rs
│   ├── sql_engine.rs
│   └── mongo_engine.rs
└── tests/
    └── driver_tests.rs
```

---

## Các nhiệm vụ chi tiết (Tasks)

### Task 1: Initialize shared-rust Crate & Cargo.toml

**Files:**
- Create: `packages/shared-rust/Cargo.toml`
- Create: `packages/shared-rust/src/lib.rs`

- [x] **Step 1: Tạo file cấu hình `packages/shared-rust/Cargo.toml`**

Tạo file `Cargo.toml` khai báo các dependencies cần thiết cho kết nối cơ sở dữ liệu và UniFFI:

```toml
[package]
name = "shared_rust"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["lib", "staticlib", "cdylib"]

[dependencies]
tokio = { version = "1.0", features = ["full"] }
sqlx = { version = "0.7", features = ["runtime-tokio-native-tls", "postgres", "mysql", "sqlite"] }
mongodb = { version = "2.8", default-features = false, features = ["tokio-runtime"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
dashmap = "5.5"
uniffi = { version = "0.25", features = ["tokio"] }
lazy_static = "1.4"

[build-dependencies]
uniffi = { version = "0.25", features = ["build"] }
```

- [x] **Step 2: Tạo file `packages/shared-rust/src/lib.rs` cơ bản**

Khai báo module cấu trúc:

```rust
pub mod connection;
pub mod sql_engine;
pub mod mongo_engine;

uniffi::setup_scaffolding!();
```

---

### Task 2: Define Connection State & Management

**Files:**
- Create: `packages/shared-rust/src/connection.rs`

- [x] **Step 1: Hiện thực hóa cấu trúc Connection State trong `connection.rs`**

Sử dụng `dashmap` để lưu trữ các Connection Pool toàn cục cho Postgres, Mysql, SQLite và MongoClient:

```rust
use dashmap::DashMap;
use lazy_static::lazy_static;
use sqlx::{Pool, Postgres, MySql, Sqlite};
use mongodb::Client as MongoClient;

pub enum ConnectionPool {
    Postgres(Pool<Postgres>),
    MySql(Pool<MySql>),
    Sqlite(Pool<Sqlite>),
    Mongo(MongoClient),
}

lazy_static! {
    pub static ref CONNECTIONS: DashMap<String, ConnectionPool> = DashMap::new();
}

#[derive(uniffi::Enum)]
pub enum DbType {
    Postgres,
    Mysql,
    Sqlite,
    Mongodb,
}

#[derive(uniffi::Record)]
pub struct QueryResult {
    pub rows: Vec<String>,
    pub affected_rows: u64,
}
```

- [x] **Step 2: Viết các hàm `connect` và `disconnect` trong `connection.rs`**

```rust
use uuid::Uuid;

#[uniffi::export]
pub async fn connect(db_type: DbType, connection_string: String) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    
    match db_type {
        DbType::Postgres => {
            let pool = Pool::<Postgres>::connect(&connection_string)
                .await
                .map_err(|e| e.to_string())?;
            CONNECTIONS.insert(id.clone(), ConnectionPool::Postgres(pool));
        }
        DbType::Mysql => {
            let pool = Pool::<MySql>::connect(&connection_string)
                .await
                .map_err(|e| e.to_string())?;
            CONNECTIONS.insert(id.clone(), ConnectionPool::MySql(pool));
        }
        DbType::Sqlite => {
            let pool = Pool::<Sqlite>::connect(&connection_string)
                .await
                .map_err(|e| e.to_string())?;
            CONNECTIONS.insert(id.clone(), ConnectionPool::Sqlite(pool));
        }
        DbType::Mongodb => {
            let client = MongoClient::with_uri_str(&connection_string)
                .await
                .map_err(|e| e.to_string())?;
            CONNECTIONS.insert(id.clone(), ConnectionPool::Mongo(client));
        }
    }
    
    Ok(id)
}

#[uniffi::export]
pub fn disconnect(connection_id: String) -> Result<(), String> {
    if CONNECTIONS.remove(&connection_id).is_some() {
        Ok(())
    } else {
        Err("Connection not found".to_string())
    }
}
```

---

### Task 3: Implement SQL and MongoDB Execution Engines

**Files:**
- Create: `packages/shared-rust/src/sql_engine.rs`
- Create: `packages/shared-rust/src/mongo_engine.rs`
- Modify: `packages/shared-rust/src/connection.rs`

- [x] **Step 1: Viết hàm execute SQL trong `sql_engine.rs`**

Ánh xạ kết quả hàng (Row) của SQL thành JSON String:

```rust
use sqlx::{Pool, Postgres, MySql, Sqlite, Row, Column};
use serde_json::{Map, Value};

pub async fn execute_postgres(pool: &Pool<Postgres>, sql: &str) -> Result<super::connection::QueryResult, String> {
    let rows = sqlx::query(sql)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;
        
    let mut json_rows = Vec::new();
    let mut affected_rows = 0;
    
    for row in rows {
        let mut map = Map::new();
        for col in row.columns() {
            let name = col.name();
            // Lấy giá trị động dưới dạng string hoặc json đại diện
            let val: Option<String> = row.try_get(name).ok();
            map.insert(name.to_string(), Value::String(val.unwrap_or_default()));
        }
        json_rows.push(serde_json::to_string(&map).unwrap_or_default());
        affected_rows += 1;
    }
    
    Ok(super::connection::QueryResult {
        rows: json_rows,
        affected_rows,
    })
}
```

- [x] **Step 2: Viết hàm execute MongoDB trong `mongo_engine.rs`**

Parse câu lệnh query MongoDB dưới dạng JSON và gọi client tương ứng:

```rust
use mongodb::Client;
use serde_json::Value;

pub async fn execute_mongo(client: &Client, query_str: &str) -> Result<super::connection::QueryResult, String> {
    let parsed: Value = serde_json::from_str(query_str).map_err(|e| e.to_string())?;
    let collection_name = parsed["collection"].as_str().ok_or("Missing collection field")?;
    let operation = parsed["operation"].as_str().ok_or("Missing operation field")?;
    
    let db = client.default_database().ok_or("No default database found")?;
    let collection = db.collection::<mongodb::bson::Document>(collection_name);
    
    let mut json_rows = Vec::new();
    
    if operation == "find" {
        let filter = parsed["filter"].as_object()
            .map(|m| serde_json::to_string(m).unwrap())
            .and_then(|s| mongodb::bson::from_slice(s.as_bytes()).ok())
            .unwrap_or_default();
            
        let mut cursor = collection.find(filter, None).await.map_err(|e| e.to_string())?;
        use mongodb::bson::Bson;
        while cursor.advance().await.map_err(|e| e.to_string())? {
            let doc = cursor.deserialize_current().map_err(|e| e.to_string())?;
            let val = Bson::Document(doc).into_relaxed_extjson();
            json_rows.push(val.to_string());
        }
    }
    
    Ok(super::connection::QueryResult {
        rows: json_rows,
        affected_rows: 0,
    })
}
```

- [x] **Step 3: Khai báo hàm `execute_query` chính tại `connection.rs`**

```rust
#[uniffi::export]
pub async fn execute_query(connection_id: String, query: String) -> Result<QueryResult, String> {
    let conn = CONNECTIONS.get(&connection_id)
        .ok_or_else(|| "Connection not found".to_string())?;
        
    match conn.value() {
        ConnectionPool::Postgres(pool) => {
            crate::sql_engine::execute_postgres(pool, &query).await
        }
        _ => Err("Not implemented".to_string())
    }
}
```
