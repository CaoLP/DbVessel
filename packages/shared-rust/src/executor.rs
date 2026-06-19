use crate::models::{QueryResult, DbError};
use crate::connection::{CONNECTION_POOL, DbPool};
use sqlx::{Row, Column, TypeInfo, ValueRef};
use sqlx::postgres::PgRow;
use sqlx::mysql::MySqlRow;
use sqlx::sqlite::SqliteRow;
use serde_json::Value;

/// Decodes a single Postgres cell into JSON based on its native type name. Using the native
/// `sqlx::Postgres` driver (rather than `sqlx::Any`, which only supports a handful of
/// canonical types and chokes on `boolean`/`timestamp`/`numeric`/`uuid`/`json`/the internal
/// `name` type — see docs/FEATURE_ROADMAP.md) means every common Postgres type decodes
/// directly; anything truly exotic (arrays, ranges, custom enums, geometric types) falls back
/// to a best-effort string read rather than failing the whole query.
fn pg_cell_to_json(row: &PgRow, idx: usize, type_name: &str) -> Value {
    if matches!(row.try_get_raw(idx), Ok(v) if v.is_null()) {
        return Value::Null;
    }
    match type_name {
        "BOOL" => row.try_get::<bool, _>(idx).map(Value::Bool).unwrap_or(Value::Null),
        "INT2" => row.try_get::<i16, _>(idx).map(Value::from).unwrap_or(Value::Null),
        "INT4" => row.try_get::<i32, _>(idx).map(Value::from).unwrap_or(Value::Null),
        "INT8" => row.try_get::<i64, _>(idx).map(Value::from).unwrap_or(Value::Null),
        "FLOAT4" => row.try_get::<f32, _>(idx).map(Value::from).unwrap_or(Value::Null),
        "FLOAT8" => row.try_get::<f64, _>(idx).map(Value::from).unwrap_or(Value::Null),
        "NUMERIC" => row
            .try_get::<sqlx::types::BigDecimal, _>(idx)
            .map(|d| Value::String(d.to_string()))
            .unwrap_or(Value::Null),
        "TEXT" | "VARCHAR" | "BPCHAR" | "NAME" | "CHAR" | "CITEXT" => {
            row.try_get::<String, _>(idx).map(Value::String).unwrap_or(Value::Null)
        }
        "UUID" => row
            .try_get::<sqlx::types::Uuid, _>(idx)
            .map(|u| Value::String(u.to_string()))
            .unwrap_or(Value::Null),
        "JSON" | "JSONB" => row.try_get::<Value, _>(idx).unwrap_or(Value::Null),
        "DATE" => row
            .try_get::<sqlx::types::chrono::NaiveDate, _>(idx)
            .map(|d| Value::String(d.to_string()))
            .unwrap_or(Value::Null),
        "TIME" => row
            .try_get::<sqlx::types::chrono::NaiveTime, _>(idx)
            .map(|t| Value::String(t.to_string()))
            .unwrap_or(Value::Null),
        "TIMESTAMP" => row
            .try_get::<sqlx::types::chrono::NaiveDateTime, _>(idx)
            .map(|t| Value::String(t.to_string()))
            .unwrap_or(Value::Null),
        "TIMESTAMPTZ" => row
            .try_get::<sqlx::types::chrono::DateTime<sqlx::types::chrono::Utc>, _>(idx)
            .map(|t| Value::String(t.to_rfc3339()))
            .unwrap_or(Value::Null),
        "BYTEA" => row
            .try_get::<Vec<u8>, _>(idx)
            .map(|b| Value::Array(b.into_iter().map(Value::from).collect()))
            .unwrap_or(Value::Null),
        // Best-effort fallback for anything not special-cased above (arrays, ranges, enums,
        // geometric types, ...): most still round-trip through Postgres' text representation.
        _ => row.try_get::<String, _>(idx).map(Value::String).unwrap_or(Value::Null),
    }
}

/// MySQL has no native boolean — TINYINT(1) is the idiomatic stand-in — so it's decoded as a
/// plain integer rather than guessed at as a bool.
fn mysql_cell_to_json(row: &MySqlRow, idx: usize, type_name: &str) -> Value {
    if matches!(row.try_get_raw(idx), Ok(v) if v.is_null()) {
        return Value::Null;
    }
    match type_name {
        "TINYINT" => row.try_get::<i8, _>(idx).map(|v| Value::from(v as i64)).unwrap_or(Value::Null),
        "SMALLINT" => row.try_get::<i16, _>(idx).map(Value::from).unwrap_or(Value::Null),
        "INT" | "MEDIUMINT" => row.try_get::<i32, _>(idx).map(Value::from).unwrap_or(Value::Null),
        "BIGINT" => row.try_get::<i64, _>(idx).map(Value::from).unwrap_or(Value::Null),
        "FLOAT" => row.try_get::<f32, _>(idx).map(Value::from).unwrap_or(Value::Null),
        "DOUBLE" => row.try_get::<f64, _>(idx).map(Value::from).unwrap_or(Value::Null),
        "DECIMAL" => row
            .try_get::<sqlx::types::BigDecimal, _>(idx)
            .map(|d| Value::String(d.to_string()))
            .unwrap_or(Value::Null),
        "VARCHAR" | "CHAR" | "TEXT" | "TINYTEXT" | "MEDIUMTEXT" | "LONGTEXT" | "ENUM" | "SET" => {
            row.try_get::<String, _>(idx).map(Value::String).unwrap_or(Value::Null)
        }
        "DATE" => row
            .try_get::<sqlx::types::chrono::NaiveDate, _>(idx)
            .map(|d| Value::String(d.to_string()))
            .unwrap_or(Value::Null),
        "TIME" => row
            .try_get::<sqlx::types::chrono::NaiveTime, _>(idx)
            .map(|t| Value::String(t.to_string()))
            .unwrap_or(Value::Null),
        "DATETIME" | "TIMESTAMP" => row
            .try_get::<sqlx::types::chrono::NaiveDateTime, _>(idx)
            .map(|t| Value::String(t.to_string()))
            .unwrap_or(Value::Null),
        "JSON" => row.try_get::<Value, _>(idx).unwrap_or(Value::Null),
        "BLOB" | "TINYBLOB" | "MEDIUMBLOB" | "LONGBLOB" | "BINARY" | "VARBINARY" => row
            .try_get::<Vec<u8>, _>(idx)
            .map(|b| Value::Array(b.into_iter().map(Value::from).collect()))
            .unwrap_or(Value::Null),
        _ => row.try_get::<String, _>(idx).map(Value::String).unwrap_or(Value::Null),
    }
}

fn sqlite_cell_to_json(row: &SqliteRow, idx: usize, type_name: &str) -> Value {
    if matches!(row.try_get_raw(idx), Ok(v) if v.is_null()) {
        return Value::Null;
    }
    match type_name {
        "BOOLEAN" => row.try_get::<bool, _>(idx).map(Value::Bool).unwrap_or(Value::Null),
        "INTEGER" => row.try_get::<i64, _>(idx).map(Value::from).unwrap_or(Value::Null),
        "REAL" => row.try_get::<f64, _>(idx).map(Value::from).unwrap_or(Value::Null),
        "TEXT" => row.try_get::<String, _>(idx).map(Value::String).unwrap_or(Value::Null),
        "BLOB" => row
            .try_get::<Vec<u8>, _>(idx)
            .map(|b| Value::Array(b.into_iter().map(Value::from).collect()))
            .unwrap_or(Value::Null),
        _ => row.try_get::<String, _>(idx).map(Value::String).unwrap_or(Value::Null),
    }
}

fn is_row_query(query: &str) -> bool {
    let q = query.trim().to_uppercase();
    q.starts_with("SELECT") || q.starts_with("PRAGMA") || q.starts_with("SHOW") || q.starts_with("EXPLAIN")
}

pub async fn execute_query_internal(connection_id: &str, query: &str) -> Result<QueryResult, DbError> {
    let pool = {
        let map = CONNECTION_POOL.read().map_err(|_| DbError::Generic { details: "Failed to lock".to_string() })?;
        map.get(connection_id).cloned().ok_or(DbError::Generic { details: "Connection not found".to_string() })?.pool
    };

    let wants_rows = is_row_query(query);

    match pool {
        DbPool::Postgres(pool) => {
            if wants_rows {
                let rows = sqlx::query(query)
                    .fetch_all(&pool)
                    .await
                    .map_err(|e| DbError::Generic { details: format!("Query failed: {}", e) })?;
                let result_rows = rows
                    .iter()
                    .map(|r| {
                        let mut obj = serde_json::Map::new();
                        for (idx, col) in r.columns().iter().enumerate() {
                            obj.insert(col.name().to_string(), pg_cell_to_json(r, idx, col.type_info().name()));
                        }
                        serde_json::to_string(&obj).unwrap()
                    })
                    .collect();
                Ok(QueryResult { rows: result_rows, affected_rows: 0 })
            } else {
                let result = sqlx::query(query)
                    .execute(&pool)
                    .await
                    .map_err(|e| DbError::Generic { details: format!("Execute failed: {}", e) })?;
                Ok(QueryResult { rows: vec![], affected_rows: result.rows_affected() })
            }
        }
        DbPool::MySql(pool) => {
            if wants_rows {
                let rows = sqlx::query(query)
                    .fetch_all(&pool)
                    .await
                    .map_err(|e| DbError::Generic { details: format!("Query failed: {}", e) })?;
                let result_rows = rows
                    .iter()
                    .map(|r| {
                        let mut obj = serde_json::Map::new();
                        for (idx, col) in r.columns().iter().enumerate() {
                            obj.insert(col.name().to_string(), mysql_cell_to_json(r, idx, col.type_info().name()));
                        }
                        serde_json::to_string(&obj).unwrap()
                    })
                    .collect();
                Ok(QueryResult { rows: result_rows, affected_rows: 0 })
            } else {
                let result = sqlx::query(query)
                    .execute(&pool)
                    .await
                    .map_err(|e| DbError::Generic { details: format!("Execute failed: {}", e) })?;
                Ok(QueryResult { rows: vec![], affected_rows: result.rows_affected() })
            }
        }
        DbPool::Sqlite(pool) => {
            if wants_rows {
                let rows = sqlx::query(query)
                    .fetch_all(&pool)
                    .await
                    .map_err(|e| DbError::Generic { details: format!("Query failed: {}", e) })?;
                let result_rows = rows
                    .iter()
                    .map(|r| {
                        let mut obj = serde_json::Map::new();
                        for (idx, col) in r.columns().iter().enumerate() {
                            obj.insert(col.name().to_string(), sqlite_cell_to_json(r, idx, col.type_info().name()));
                        }
                        serde_json::to_string(&obj).unwrap()
                    })
                    .collect();
                Ok(QueryResult { rows: result_rows, affected_rows: 0 })
            } else {
                let result = sqlx::query(query)
                    .execute(&pool)
                    .await
                    .map_err(|e| DbError::Generic { details: format!("Execute failed: {}", e) })?;
                Ok(QueryResult { rows: vec![], affected_rows: result.rows_affected() })
            }
        }
    }
}

pub async fn get_schema_internal(connection_id: &str) -> Result<crate::models::DatabaseSchema, DbError> {
    let conn = {
        let map = CONNECTION_POOL.read().map_err(|_| DbError::Generic { details: "Failed to lock".to_string() })?;
        map.get(connection_id).cloned().ok_or(DbError::Generic { details: "Connection not found".to_string() })?
    };

    let mut schema = crate::models::DatabaseSchema { tables: vec![] };

    match conn.pool {
        DbPool::Sqlite(pool) => {
            let tables = sqlx::query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
                .fetch_all(&pool)
                .await
                .map_err(|e| DbError::Generic { details: format!("Failed to get tables: {}", e) })?;

            for t_row in tables {
                let table_name: String = t_row.try_get(0).unwrap_or_default();

                let col_query = format!("PRAGMA table_info('{}')", table_name);
                let columns = sqlx::query(&col_query)
                    .fetch_all(&pool)
                    .await
                    .map_err(|e| DbError::Generic { details: format!("Failed to get columns: {}", e) })?;

                let mut col_nodes = vec![];
                for c_row in columns {
                    let name: String = c_row.try_get("name").unwrap_or_default();
                    let data_type: String = c_row.try_get("type").unwrap_or_default();
                    let notnull: i64 = c_row.try_get("notnull").unwrap_or_default();
                    let pk: i64 = c_row.try_get("pk").unwrap_or_default();

                    col_nodes.push(crate::models::ColumnNode {
                        name,
                        data_type,
                        is_primary: pk > 0,
                        is_nullable: notnull == 0,
                    });
                }

                schema.tables.push(crate::models::TableNode {
                    name: table_name,
                    columns: col_nodes,
                    schema_name: "main".to_string(),
                });
            }
        }
        DbPool::Postgres(pool) => {
            let tables = sqlx::query(
                "SELECT table_name FROM information_schema.tables \
                 WHERE table_schema = 'public' AND table_type = 'BASE TABLE' \
                 ORDER BY table_name",
            )
            .fetch_all(&pool)
            .await
            .map_err(|e| DbError::Generic { details: format!("Failed to get tables: {}", e) })?;

            for t_row in tables {
                let table_name: String = t_row.try_get(0).unwrap_or_default();
                let escaped = table_name.replace('\'', "''");

                let col_query = format!(
                    "SELECT c.column_name, c.data_type, c.is_nullable, \
                     EXISTS ( \
                       SELECT 1 FROM information_schema.table_constraints tc \
                       JOIN information_schema.key_column_usage kcu \
                         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema \
                       WHERE tc.constraint_type = 'PRIMARY KEY' \
                         AND tc.table_schema = 'public' AND tc.table_name = '{escaped}' \
                         AND kcu.column_name = c.column_name \
                     ) AS is_primary \
                     FROM information_schema.columns c \
                     WHERE c.table_schema = 'public' AND c.table_name = '{escaped}' \
                     ORDER BY c.ordinal_position"
                );
                let columns = sqlx::query(&col_query)
                    .fetch_all(&pool)
                    .await
                    .map_err(|e| DbError::Generic { details: format!("Failed to get columns: {}", e) })?;

                let mut col_nodes = vec![];
                for c_row in columns {
                    let name: String = c_row.try_get("column_name").unwrap_or_default();
                    let data_type: String = c_row.try_get("data_type").unwrap_or_default();
                    let is_nullable: String = c_row.try_get("is_nullable").unwrap_or_default();
                    let is_primary: bool = c_row.try_get("is_primary").unwrap_or_default();

                    col_nodes.push(crate::models::ColumnNode {
                        name,
                        data_type,
                        is_primary,
                        is_nullable: is_nullable == "YES",
                    });
                }

                schema.tables.push(crate::models::TableNode {
                    name: table_name,
                    columns: col_nodes,
                    schema_name: "public".to_string(),
                });
            }
        }
        DbPool::MySql(pool) => {
            let tables = sqlx::query(
                "SELECT table_name FROM information_schema.tables \
                 WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE' \
                 ORDER BY table_name",
            )
            .fetch_all(&pool)
            .await
            .map_err(|e| DbError::Generic { details: format!("Failed to get tables: {}", e) })?;

            let current_db_row = sqlx::query("SELECT DATABASE()")
                .fetch_one(&pool)
                .await
                .map_err(|e| DbError::Generic { details: format!("Failed to get current database: {}", e) })?;
            let current_db: String = current_db_row.try_get(0).unwrap_or_default();

            for t_row in tables {
                let table_name: String = t_row.try_get(0).unwrap_or_default();
                let escaped = table_name.replace('\'', "''");

                let col_query = format!(
                    "SELECT column_name, data_type, is_nullable, column_key \
                     FROM information_schema.columns \
                     WHERE table_schema = DATABASE() AND table_name = '{escaped}' \
                     ORDER BY ordinal_position"
                );
                let columns = sqlx::query(&col_query)
                    .fetch_all(&pool)
                    .await
                    .map_err(|e| DbError::Generic { details: format!("Failed to get columns: {}", e) })?;

                let mut col_nodes = vec![];
                for c_row in columns {
                    let name: String = c_row.try_get("column_name").unwrap_or_default();
                    let data_type: String = c_row.try_get("data_type").unwrap_or_default();
                    let is_nullable: String = c_row.try_get("is_nullable").unwrap_or_default();
                    let column_key: String = c_row.try_get("column_key").unwrap_or_default();

                    col_nodes.push(crate::models::ColumnNode {
                        name,
                        data_type,
                        is_primary: column_key == "PRI",
                        is_nullable: is_nullable == "YES",
                    });
                }

                schema.tables.push(crate::models::TableNode {
                    name: table_name,
                    columns: col_nodes,
                    schema_name: current_db.clone(),
                });
            }
        }
    }

    Ok(schema)
}

/// Lists databases available on the server this connection is pointed at — not just the one
/// currently selected. Postgres' `pg_database` and MySQL's `information_schema.schemata` are
/// both server-wide catalogs visible regardless of which database the connection is bound to,
/// so this works without needing a separate admin connection. SQLite has no such concept (the
/// file *is* the database), so it just reports the single database it's already connected to.
pub async fn list_databases_internal(connection_id: &str) -> Result<Vec<String>, DbError> {
    let conn = {
        let map = CONNECTION_POOL.read().map_err(|_| DbError::Generic { details: "Failed to lock".to_string() })?;
        map.get(connection_id).cloned().ok_or(DbError::Generic { details: "Connection not found".to_string() })?
    };

    match conn.pool {
        DbPool::Sqlite(_) => Ok(vec![conn.current_database.clone()]),
        DbPool::Postgres(pool) => {
            let rows = sqlx::query("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname")
                .fetch_all(&pool)
                .await
                .map_err(|e| DbError::Generic { details: format!("Failed to list databases: {}", e) })?;
            Ok(rows.into_iter().map(|r| r.try_get::<String, _>(0).unwrap_or_default()).collect())
        }
        DbPool::MySql(pool) => {
            let rows = sqlx::query(
                "SELECT schema_name FROM information_schema.schemata \
                 WHERE schema_name NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys') \
                 ORDER BY schema_name",
            )
            .fetch_all(&pool)
            .await
            .map_err(|e| DbError::Generic { details: format!("Failed to list databases: {}", e) })?;
            Ok(rows.into_iter().map(|r| r.try_get::<String, _>(0).unwrap_or_default()).collect())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connection::connect_internal;

    #[tokio::test]
    async fn execute_query_and_get_schema_return_real_values_for_sqlite() {
        // A plain `sqlite::memory:` gives each pooled connection its own separate DB; use a
        // named shared-cache URI so all connections in the pool see the same in-memory DB.
        let id = connect_internal("sqlite", "sqlite:file:exec_test?mode=memory&cache=shared")
            .await
            .unwrap();

        execute_query_internal(&id, "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, score REAL, active BOOLEAN)")
            .await
            .unwrap();
        execute_query_internal(&id, "INSERT INTO users (id, name, score, active) VALUES (1, 'Alice', 9.5, 1)")
            .await
            .unwrap();
        execute_query_internal(&id, "INSERT INTO users (id, name, score, active) VALUES (2, 'Bob', NULL, 0)")
            .await
            .unwrap();

        let result = execute_query_internal(&id, "SELECT * FROM users ORDER BY id").await.unwrap();
        assert_eq!(result.rows.len(), 2);

        let row0: serde_json::Value = serde_json::from_str(&result.rows[0]).unwrap();
        assert_eq!(row0["id"], serde_json::json!(1));
        assert_eq!(row0["name"], serde_json::json!("Alice"));
        assert_eq!(row0["score"], serde_json::json!(9.5));
        assert_eq!(row0["active"], serde_json::json!(true));

        let row1: serde_json::Value = serde_json::from_str(&result.rows[1]).unwrap();
        assert_eq!(row1["name"], serde_json::json!("Bob"));
        assert_eq!(row1["score"], serde_json::Value::Null);

        let schema = get_schema_internal(&id).await.unwrap();
        let table = schema.tables.iter().find(|t| t.name == "users").unwrap();
        let id_col = table.columns.iter().find(|c| c.name == "id").unwrap();
        assert!(id_col.is_primary);
        let name_col = table.columns.iter().find(|c| c.name == "name").unwrap();
        assert!(!name_col.is_nullable);
    }

    #[tokio::test]
    #[ignore = "requires a local Postgres server with trust auth on 127.0.0.1:5432"]
    async fn list_databases_and_get_schema_work_against_real_postgres() {
        let id = connect_internal("postgres", "postgres://postgres@127.0.0.1:5432/postgres")
            .await
            .unwrap();

        let dbs = list_databases_internal(&id).await.unwrap();
        assert!(dbs.contains(&"postgres".to_string()), "expected 'postgres' db in {dbs:?}");

        execute_query_internal(&id, "DROP TABLE IF EXISTS pg_smoke_test").await.unwrap();
        execute_query_internal(&id, "CREATE TABLE pg_smoke_test (id SERIAL PRIMARY KEY, label TEXT)").await.unwrap();
        execute_query_internal(&id, "INSERT INTO pg_smoke_test (label) VALUES ('hello')").await.unwrap();

        let schema = get_schema_internal(&id).await.unwrap();
        let table = schema.tables.iter().find(|t| t.name == "pg_smoke_test").expect("table should be listed");
        let id_col = table.columns.iter().find(|c| c.name == "id").unwrap();
        assert!(id_col.is_primary);

        let result = execute_query_internal(&id, "SELECT * FROM pg_smoke_test").await.unwrap();
        assert_eq!(result.rows.len(), 1);
        let row0: serde_json::Value = serde_json::from_str(&result.rows[0]).unwrap();
        assert_eq!(row0["label"], serde_json::json!("hello"));

        execute_query_internal(&id, "DROP TABLE pg_smoke_test").await.unwrap();
    }

    #[tokio::test]
    #[ignore = "requires a local Postgres server with trust auth on 127.0.0.1:5432"]
    async fn native_postgres_driver_decodes_bool_timestamp_numeric_uuid_json() {
        let id = connect_internal("postgres", "postgres://postgres@127.0.0.1:5432/postgres")
            .await
            .unwrap();

        execute_query_internal(&id, "DROP TABLE IF EXISTS pg_types_test").await.unwrap();
        execute_query_internal(
            &id,
            "CREATE TABLE pg_types_test ( \
                id SERIAL PRIMARY KEY, \
                flag BOOLEAN, \
                created_at TIMESTAMP DEFAULT '2024-01-15 10:30:00', \
                amount NUMERIC(10,2), \
                uid UUID DEFAULT '550e8400-e29b-41d4-a716-446655440000', \
                payload JSONB \
            )",
        )
        .await
        .unwrap();
        execute_query_internal(
            &id,
            "INSERT INTO pg_types_test (flag, amount, payload) VALUES (true, 42.50, '{\"a\": 1}')",
        )
        .await
        .unwrap();

        let result = execute_query_internal(&id, "SELECT * FROM pg_types_test").await.unwrap();
        execute_query_internal(&id, "DROP TABLE pg_types_test").await.unwrap();

        assert_eq!(result.rows.len(), 1);
        let row: serde_json::Value = serde_json::from_str(&result.rows[0]).unwrap();
        assert_eq!(row["flag"], serde_json::json!(true));
        assert_eq!(row["amount"].as_str().unwrap().parse::<f64>().unwrap(), 42.50);
        assert_eq!(row["uid"], serde_json::json!("550e8400-e29b-41d4-a716-446655440000"));
        assert_eq!(row["payload"]["a"], serde_json::json!(1));
        assert!(row["created_at"].as_str().unwrap().starts_with("2024-01-15"));
    }

    #[tokio::test]
    #[ignore = "requires a local Postgres server with trust auth on 127.0.0.1:5432; reproduces the grid-edit-then-data-disappears report"]
    async fn update_then_reselect_preserves_other_rows() {
        let id = connect_internal("postgres", "postgres://postgres@127.0.0.1:5432/postgres")
            .await
            .unwrap();

        execute_query_internal(&id, "DROP TABLE IF EXISTS grid_edit_test").await.unwrap();
        execute_query_internal(&id, "CREATE TABLE grid_edit_test (id SERIAL PRIMARY KEY, name TEXT, score INT)").await.unwrap();
        execute_query_internal(&id, "INSERT INTO grid_edit_test (name, score) VALUES ('Alice', 10), ('Bob', 20)").await.unwrap();

        // Exactly what DataGrid's onCellValueChanged builds for editing the "score" cell of
        // row id=1 from 10 to 99: UPDATE ... SET "score" = 99 WHERE "id" = 1
        let update_sql = "UPDATE \"grid_edit_test\" SET \"score\" = 99 WHERE \"id\" = 1";
        execute_query_internal(&id, update_sql).await.unwrap();

        // Then exactly what handleMutate does: re-run the original SELECT.
        let result = execute_query_internal(&id, "SELECT * FROM grid_edit_test ORDER BY id").await.unwrap();
        execute_query_internal(&id, "DROP TABLE grid_edit_test").await.unwrap();

        assert_eq!(result.rows.len(), 2, "expected both rows to survive the update+reselect, got: {:?}", result.rows);
        let row0: serde_json::Value = serde_json::from_str(&result.rows[0]).unwrap();
        let row1: serde_json::Value = serde_json::from_str(&result.rows[1]).unwrap();
        assert_eq!(row0["score"], serde_json::json!(99));
        assert_eq!(row1["score"], serde_json::json!(20));
    }
}
