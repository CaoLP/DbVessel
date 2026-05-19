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
