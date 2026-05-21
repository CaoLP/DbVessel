use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    pub rows: Vec<String>,
    pub affected_rows: u64,
}

#[derive(Debug, Error)]
pub enum DbError {
    #[error("{message}")]
    Generic { message: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnNode {
    pub name: String,
    pub data_type: String,
    pub is_primary: bool,
    pub is_nullable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableNode {
    pub name: String,
    pub columns: Vec<ColumnNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseSchema {
    pub tables: Vec<TableNode>,
}
