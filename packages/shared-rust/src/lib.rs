pub mod models;
pub mod connection;
pub mod executor;

uniffi::setup_scaffolding!();

pub use models::{QueryResult, DbError, DatabaseSchema};

lazy_static::lazy_static! {
    // A single, process-lifetime Tokio runtime shared by every call. sqlx connections (and
    // the pool's background maintenance task) are bound to the runtime that created them —
    // spinning up a fresh `Runtime::new()` per call (as this used to do) orphans every pooled
    // connection the moment that call's runtime is dropped, since the orphaned connections'
    // underlying sockets have no I/O driver left to poll them. The next call then blocks
    // trying to acquire a connection from the pool and times out
    // ("pool timed out while waiting for an open connection") even though the pool object
    // itself is still alive in CONNECTION_POOL.
    static ref RUNTIME: tokio::runtime::Runtime = tokio::runtime::Runtime::new().unwrap();
}

// Helper to run async code in sync context
fn run_async<F: std::future::Future>(f: F) -> F::Output {
    RUNTIME.block_on(f)
}

#[uniffi::export]
pub fn connect(db_type: String, connection_string: String) -> Result<String, DbError> {
    run_async(connection::connect_internal(&db_type, &connection_string))
}

#[uniffi::export]
pub fn disconnect(connection_id: String) -> Result<(), DbError> {
    run_async(connection::disconnect_internal(&connection_id))
}

#[uniffi::export]
pub fn execute_query(connection_id: String, query: String) -> Result<QueryResult, DbError> {
    run_async(executor::execute_query_internal(&connection_id, &query))
}

#[uniffi::export]
pub fn get_schema(connection_id: String) -> Result<DatabaseSchema, DbError> {
    run_async(executor::get_schema_internal(&connection_id))
}

#[uniffi::export]
pub fn list_databases(connection_id: String) -> Result<Vec<String>, DbError> {
    run_async(executor::list_databases_internal(&connection_id))
}

#[uniffi::export]
pub fn switch_database(connection_id: String, database_name: String) -> Result<(), DbError> {
    run_async(connection::switch_database_internal(&connection_id, &database_name))
}
