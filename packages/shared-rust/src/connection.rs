use sqlx::{MySqlPool, PgPool, SqlitePool};
use sqlx::mysql::MySqlPoolOptions;
use sqlx::postgres::PgPoolOptions;
use sqlx::sqlite::SqlitePoolOptions;
use std::collections::HashMap;
use std::sync::RwLock;
use lazy_static::lazy_static;
use uuid::Uuid;
use crate::models::DbError;

/// Normalized database kind, derived from the connection string scheme at connect time.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DbKind {
    Postgres,
    MySql,
    Sqlite,
}

impl DbKind {
    fn from_connection_string(connection_string: &str) -> Result<Self, DbError> {
        if connection_string.starts_with("postgres:") || connection_string.starts_with("postgresql:") {
            Ok(DbKind::Postgres)
        } else if connection_string.starts_with("mysql:") || connection_string.starts_with("mariadb:") {
            Ok(DbKind::MySql)
        } else if connection_string.starts_with("sqlite:") {
            Ok(DbKind::Sqlite)
        } else {
            Err(DbError::Generic { details: format!("Unrecognized database url: {connection_string:?}") })
        }
    }
}

/// A native, per-backend connection pool. Using each backend's own sqlx driver (instead of
/// `sqlx::Any`) means full native type decoding — booleans, timestamps, numeric, uuid, json,
/// etc. all just work, since `sqlx::Any` only supports a small fixed set of canonical types
/// (see executor.rs's git history / docs/FEATURE_ROADMAP.md for the issue this replaced).
#[derive(Clone)]
pub enum DbPool {
    Postgres(PgPool),
    MySql(MySqlPool),
    Sqlite(SqlitePool),
}

impl DbPool {
    pub async fn close(&self) {
        match self {
            DbPool::Postgres(p) => p.close().await,
            DbPool::MySql(p) => p.close().await,
            DbPool::Sqlite(p) => p.close().await,
        }
    }
}

#[derive(Clone)]
pub struct Connection {
    pub pool: DbPool,
    pub kind: DbKind,
    /// Everything before the database segment, e.g. `postgres://user:pass@host:5432`.
    /// Needed to build a fresh pool against a different database (Postgres/MySQL connections
    /// are bound to one database each, so "switching" means reconnecting).
    pub base_url: String,
    /// Original query-string suffix (including leading `?`), preserved across switches.
    pub query_suffix: String,
    pub current_database: String,
}

/// Splits a connection URL into (base, database, query-suffix). E.g.
/// `postgres://u:p@host:5432/mydb?sslmode=disable` -> (`postgres://u:p@host:5432`, `mydb`, `?sslmode=disable`).
fn split_db_url(url: &str) -> (String, String, String) {
    let (path_part, query) = match url.split_once('?') {
        Some((p, q)) => (p, format!("?{q}")),
        None => (url, String::new()),
    };
    match path_part.rsplit_once('/') {
        Some((base, db)) if base.contains("://") => (base.to_string(), db.to_string(), query),
        _ => (path_part.to_string(), String::new(), query),
    }
}

fn build_db_url(base: &str, db: &str, query: &str) -> String {
    format!("{base}/{db}{query}")
}

async fn connect_pool(kind: DbKind, connection_string: &str) -> Result<DbPool, sqlx::Error> {
    match kind {
        DbKind::Postgres => PgPoolOptions::new().max_connections(5).connect(connection_string).await.map(DbPool::Postgres),
        DbKind::MySql => MySqlPoolOptions::new().max_connections(5).connect(connection_string).await.map(DbPool::MySql),
        DbKind::Sqlite => SqlitePoolOptions::new().max_connections(5).connect(connection_string).await.map(DbPool::Sqlite),
    }
}

lazy_static! {
    pub static ref CONNECTION_POOL: RwLock<HashMap<String, Connection>> = RwLock::new(HashMap::new());
}

pub async fn connect_internal(db_type: &str, connection_string: &str) -> Result<String, DbError> {
    let kind = DbKind::from_connection_string(connection_string)?;
    let _ = db_type; // db_type is informational; the connection string scheme is authoritative

    let pool = connect_pool(kind, connection_string)
        .await
        .map_err(|e| DbError::Generic { details: format!("Failed to connect: {}", e) })?;
    let (base_url, current_database, query_suffix) = split_db_url(connection_string);

    let id = Uuid::new_v4().to_string();
    let mut map = CONNECTION_POOL.write().map_err(|_| DbError::Generic { details: "Failed to acquire lock".to_string() })?;
    map.insert(id.clone(), Connection { pool, kind, base_url, query_suffix, current_database });

    Ok(id)
}

/// Reconnects the given session to a different database on the same server (Postgres/MySQL
/// only — SQLite has exactly one database per connection/file). Replaces the pool in place so
/// the connection_id the frontend already holds keeps working.
pub async fn switch_database_internal(connection_id: &str, database_name: &str) -> Result<(), DbError> {
    let (kind, base_url, query_suffix) = {
        let map = CONNECTION_POOL.read().map_err(|_| DbError::Generic { details: "Failed to lock".to_string() })?;
        let conn = map.get(connection_id).ok_or(DbError::Generic { details: "Connection not found".to_string() })?;
        if conn.kind == DbKind::Sqlite {
            return Err(DbError::Generic { details: "SQLite has a single database per connection".to_string() });
        }
        (conn.kind, conn.base_url.clone(), conn.query_suffix.clone())
    };

    let new_url = build_db_url(&base_url, database_name, &query_suffix);
    let new_pool = connect_pool(kind, &new_url)
        .await
        .map_err(|e| DbError::Generic { details: format!("Failed to switch database: {}", e) })?;

    let mut map = CONNECTION_POOL.write().map_err(|_| DbError::Generic { details: "Failed to acquire lock".to_string() })?;
    if let Some(old) = map.insert(
        connection_id.to_string(),
        Connection { pool: new_pool, kind, base_url, query_suffix, current_database: database_name.to_string() },
    ) {
        // Close the old pool after releasing the write lock to avoid blocking other readers
        // on a network round-trip; spawn it off instead of awaiting inline here.
        tokio::spawn(async move { old.pool.close().await });
    }

    Ok(())
}

pub async fn disconnect_internal(connection_id: &str) -> Result<(), DbError> {
    let mut map = CONNECTION_POOL.write().map_err(|_| DbError::Generic { details: "Failed to acquire lock".to_string() })?;
    if let Some(conn) = map.remove(connection_id) {
        conn.pool.close().await;
        Ok(())
    } else {
        Err(DbError::Generic { details: "Connection not found".to_string() })
    }
}
