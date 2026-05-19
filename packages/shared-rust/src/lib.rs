pub mod models;
pub mod connection;

uniffi::include_scaffolding!("shared_rust");

pub use models::{QueryResult, DbError};

// Helper to run async code in sync context
fn run_async<F: std::future::Future>(f: F) -> F::Output {
    tokio::runtime::Runtime::new().unwrap().block_on(f)
}

pub fn connect(db_type: String, connection_string: String) -> Result<String, DbError> {
    run_async(connection::connect_internal(&db_type, &connection_string))
}

pub fn disconnect(connection_id: String) -> Result<(), DbError> {
    run_async(connection::disconnect_internal(&connection_id))
}

pub fn execute_query(connection_id: String, query: String) -> Result<QueryResult, DbError> {
    Ok(QueryResult { rows: vec![], affected_rows: 0 })
}
