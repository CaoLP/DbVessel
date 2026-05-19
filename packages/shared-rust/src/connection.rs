use sqlx::any::AnyPoolOptions;
use sqlx::AnyPool;
use std::collections::HashMap;
use std::sync::RwLock;
use lazy_static::lazy_static;
use uuid::Uuid;
use crate::models::DbError;

lazy_static! {
    pub static ref CONNECTION_POOL: RwLock<HashMap<String, AnyPool>> = RwLock::new(HashMap::new());
}

pub async fn connect_internal(db_type: &str, connection_string: &str) -> Result<String, DbError> {
    sqlx::any::install_default_drivers();
    
    // sqlx Any driver requires the URL to have the correct scheme (e.g. postgres://, mysql://, sqlite://)
    let pool = AnyPoolOptions::new()
        .max_connections(5)
        .connect(connection_string)
        .await
        .map_err(|e| DbError::Generic { message: format!("Failed to connect: {}", e) })?;

    let id = Uuid::new_v4().to_string();
    let mut map = CONNECTION_POOL.write().map_err(|_| DbError::Generic { message: "Failed to acquire lock".to_string() })?;
    map.insert(id.clone(), pool);

    Ok(id)
}

pub async fn disconnect_internal(connection_id: &str) -> Result<(), DbError> {
    let mut map = CONNECTION_POOL.write().map_err(|_| DbError::Generic { message: "Failed to acquire lock".to_string() })?;
    if let Some(pool) = map.remove(connection_id) {
        pool.close().await;
        Ok(())
    } else {
        Err(DbError::Generic { message: "Connection not found".to_string() })
    }
}
