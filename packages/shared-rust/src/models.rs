use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct QueryResult {
    pub rows: Vec<String>,
    pub affected_rows: u64,
}

#[derive(Debug, Error, uniffi::Error)]
pub enum DbError {
    // Field is named `details`, not `message`: uniffi's generated Kotlin/Swift error types
    // implement the platform's base exception/error message property, so a variant field
    // literally named `message` collides with that override.
    #[error("{details}")]
    Generic { details: String },
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct ColumnNode {
    pub name: String,
    pub data_type: String,
    pub is_primary: bool,
    pub is_nullable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TableNode {
    pub name: String,
    pub columns: Vec<ColumnNode>,
    /// The owning schema/database namespace: SQLite has none (reported as "main"),
    /// Postgres uses its schema concept (currently always "public"), MySQL uses the
    /// connected database name as its schema equivalent.
    pub schema_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct DatabaseSchema {
    pub tables: Vec<TableNode>,
}
