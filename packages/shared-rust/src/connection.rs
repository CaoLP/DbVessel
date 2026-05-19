use dashmap::DashMap;
use lazy_static::lazy_static;
use sqlx::{Pool, Postgres, MySql, Sqlite};
use mongodb::Client as MongoClient;
use uuid::Uuid;

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

#[uniffi::export]
pub async fn execute_query(connection_id: String, query: String) -> Result<QueryResult, String> {
    let conn = CONNECTIONS.get(&connection_id)
        .ok_or_else(|| "Connection not found".to_string())?;
        
    match conn.value() {
        ConnectionPool::Postgres(pool) => {
            crate::sql_engine::execute_postgres(pool, &query).await
        }
        ConnectionPool::MySql(pool) => {
            crate::sql_engine::execute_mysql(pool, &query).await
        }
        ConnectionPool::Sqlite(pool) => {
            crate::sql_engine::execute_sqlite(pool, &query).await
        }
        ConnectionPool::Mongo(client) => {
            crate::mongo_engine::execute_mongo(client, &query).await
        }
    }
}
