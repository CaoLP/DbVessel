use crate::models::{QueryResult, DbError};
use crate::connection::CONNECTION_POOL;
use sqlx::{Row, Column};

pub async fn execute_query_internal(connection_id: &str, query: &str) -> Result<QueryResult, DbError> {
    let pool = {
        let map = CONNECTION_POOL.read().map_err(|_| DbError::Generic { message: "Failed to lock".to_string() })?;
        map.get(connection_id).cloned().ok_or(DbError::Generic { message: "Connection not found".to_string() })?
    };

    // Determine if it's a structural query (like INSERT/UPDATE/DELETE) or returning rows
    if query.trim().to_uppercase().starts_with("SELECT") || query.trim().to_uppercase().starts_with("PRAGMA") || query.trim().to_uppercase().starts_with("SHOW") {
        let rows = sqlx::query(query)
            .fetch_all(&pool)
            .await
            .map_err(|e| DbError::Generic { message: format!("Query failed: {}", e) })?;
            
        // For MVP: Return rows serialized as JSON strings.
        // Handling dynamic AnyRow mapping to JSON is complex, we will stub it to return string representations.
        let mut result_rows = Vec::new();
        for r in rows {
            let mut row_obj = serde_json::Map::new();
            for col in r.columns() {
                // In a production setup, we need dynamic casting based on col.type_info()
                // For this MVP step, we will just return placeholder values to prove the bridge works.
                row_obj.insert(col.name().to_string(), serde_json::Value::String("Value_Placeholder".to_string()));
            }
            result_rows.push(serde_json::to_string(&row_obj).unwrap());
        }
        
        Ok(QueryResult { rows: result_rows, affected_rows: 0 })
    } else {
        let result = sqlx::query(query)
            .execute(&pool)
            .await
            .map_err(|e| DbError::Generic { message: format!("Execute failed: {}", e) })?;
            
        Ok(QueryResult { rows: vec![], affected_rows: result.rows_affected() })
}

pub async fn get_schema_internal(connection_id: &str) -> Result<crate::models::DatabaseSchema, DbError> {
    let pool = {
        let map = CONNECTION_POOL.read().map_err(|_| DbError::Generic { message: "Failed to lock".to_string() })?;
        map.get(connection_id).cloned().ok_or(DbError::Generic { message: "Connection not found".to_string() })?
    };

    let kind = pool.any_kind();
    
    // Using a simplistic approach for MVP
    let mut schema = crate::models::DatabaseSchema { tables: vec![] };

    if kind == sqlx::any::AnyKind::Sqlite {
        // Fetch tables
        let tables = sqlx::query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            .fetch_all(&pool)
            .await
            .map_err(|e| DbError::Generic { message: format!("Failed to get tables: {}", e) })?;
            
        for t_row in tables {
            let table_name: String = t_row.try_get(0).unwrap_or_default();
            
            // Fetch columns for table
            let col_query = format!("PRAGMA table_info('{}')", table_name);
            let columns = sqlx::query(&col_query)
                .fetch_all(&pool)
                .await
                .map_err(|e| DbError::Generic { message: format!("Failed to get columns: {}", e) })?;
                
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
            });
        }
    } else {
        // Fallback for Postgres/MySQL MVP
        return Err(DbError::Generic { message: "Schema extraction for this DB type is not yet implemented in Phase 4.5 MVP".to_string() });
    }

    Ok(schema)
}
