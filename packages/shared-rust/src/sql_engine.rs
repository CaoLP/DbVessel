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
            // Lấy giá trị dưới dạng string một cách an toàn
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

pub async fn execute_mysql(pool: &Pool<MySql>, sql: &str) -> Result<super::connection::QueryResult, String> {
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

pub async fn execute_sqlite(pool: &Pool<Sqlite>, sql: &str) -> Result<super::connection::QueryResult, String> {
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
