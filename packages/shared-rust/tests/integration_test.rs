use shared_rust::{connect, disconnect, execute_query};

#[test]
fn test_sqlite_in_memory_flow() {
    // 1. Connect
    let conn_id = connect("sqlite".to_string(), "sqlite://test.db?mode=rwc".to_string())
        .expect("Failed to connect to in-memory sqlite");
        
    // 2. Create Table
    let res = execute_query(conn_id.clone(), "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)".to_string())
        .expect("Failed to create table");
    assert_eq!(res.affected_rows, 0); // CREATE usually returns 0
    
    // 3. Insert
    let res = execute_query(conn_id.clone(), "INSERT INTO users (name) VALUES ('Antigravity')".to_string())
        .expect("Failed to insert");
    assert_eq!(res.affected_rows, 1);
    
    // 4. Select
    let res = execute_query(conn_id.clone(), "SELECT * FROM users".to_string())
        .expect("Failed to select");
    assert_eq!(res.rows.len(), 1); // Returns 1 row
    
    // 5. Disconnect
    disconnect(conn_id).expect("Failed to disconnect");
    
    // 6. Cleanup
    let _ = std::fs::remove_file("test.db");
    let _ = std::fs::remove_file("test.db-shm");
    let _ = std::fs::remove_file("test.db-wal");
}
