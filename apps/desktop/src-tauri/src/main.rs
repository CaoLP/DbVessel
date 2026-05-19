// Prevents additional console window on Windows in release
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use shared_rust::{connect, disconnect, execute_query, QueryResult, DbError};

#[tauri::command]
fn db_connect(db_type: String, connection_string: String) -> Result<String, String> {
    connect(db_type, connection_string).map_err(|e| match e {
        DbError::Generic { message } => message,
    })
}

#[tauri::command]
fn db_disconnect(connection_id: String) -> Result<(), String> {
    disconnect(connection_id).map_err(|e| match e {
        DbError::Generic { message } => message,
    })
}

#[tauri::command]
fn db_execute_query(connection_id: String, query: String) -> Result<QueryResult, String> {
    execute_query(connection_id, query).map_err(|e| match e {
        DbError::Generic { message } => message,
    })
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![db_connect, db_disconnect, db_execute_query])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
