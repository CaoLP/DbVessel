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
}
