pub mod models;

uniffi::include_scaffolding!("shared_rust");

pub use models::{QueryResult, DbError};

pub fn connect(db_type: String, connection_string: String) -> Result<String, DbError> {
    Ok("mock-id".to_string())
}

pub fn disconnect(connection_id: String) -> Result<(), DbError> {
    Ok(())
}

pub fn execute_query(connection_id: String, query: String) -> Result<QueryResult, DbError> {
    Ok(QueryResult { rows: vec![], affected_rows: 0 })
}
