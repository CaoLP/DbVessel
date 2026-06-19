// Prevents additional console window on Windows in release
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use shared_rust::{connect, disconnect, execute_query, get_schema, list_databases, switch_database, QueryResult, DbError};

#[tauri::command]
fn db_connect(db_type: String, connection_string: String) -> Result<String, String> {
    connect(db_type, connection_string).map_err(|e| match e {
        DbError::Generic { details } => details,
    })
}

#[tauri::command]
fn db_disconnect(connection_id: String) -> Result<(), String> {
    disconnect(connection_id).map_err(|e| match e {
        DbError::Generic { details } => details,
    })
}

#[tauri::command]
fn db_execute_query(connection_id: String, query: String) -> Result<QueryResult, String> {
    execute_query(connection_id, query).map_err(|e| match e {
        DbError::Generic { details } => details,
    })
}

#[tauri::command]
fn db_get_schema(connection_id: String) -> Result<shared_rust::models::DatabaseSchema, String> {
    get_schema(connection_id).map_err(|e| match e {
        DbError::Generic { details } => details,
    })
}

#[tauri::command]
fn db_list_databases(connection_id: String) -> Result<Vec<String>, String> {
    list_databases(connection_id).map_err(|e| match e {
        DbError::Generic { details } => details,
    })
}

#[tauri::command]
fn db_switch_database(connection_id: String, database_name: String) -> Result<(), String> {
    switch_database(connection_id, database_name).map_err(|e| match e {
        DbError::Generic { details } => details,
    })
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            db_connect, db_disconnect, db_execute_query, db_get_schema, db_list_databases, db_switch_database
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
