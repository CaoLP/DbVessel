use mongodb::Client;
use serde_json::Value;

pub async fn execute_mongo(client: &Client, query_str: &str) -> Result<super::connection::QueryResult, String> {
    let parsed: Value = serde_json::from_str(query_str).map_err(|e| e.to_string())?;
    let collection_name = parsed["collection"].as_str().ok_or("Missing collection field")?;
    let operation = parsed["operation"].as_str().ok_or("Missing operation field")?;
    
    let db = client.default_database().ok_or("No default database found")?;
    let collection = db.collection::<mongodb::bson::Document>(collection_name);
    
    let mut json_rows = Vec::new();
    let mut affected_rows = 0;
    
    if operation == "find" {
        let filter = parsed["filter"].as_object()
            .map(|m| serde_json::to_string(m).unwrap())
            .and_then(|s| mongodb::bson::from_slice(s.as_bytes()).ok())
            .unwrap_or_default();
            
        let mut cursor = collection.find(filter, None).await.map_err(|e| e.to_string())?;
        use mongodb::bson::Bson;
        while cursor.advance().await.map_err(|e| e.to_string())? {
            let doc = cursor.deserialize_current().map_err(|e| e.to_string())?;
            let val = Bson::Document(doc).into_relaxed_extjson();
            json_rows.push(val.to_string());
            affected_rows += 1;
        }
    } else if operation == "insert" {
        let doc_val = parsed["document"].as_object()
            .ok_or("Missing document field for insert")?;
        let doc_str = serde_json::to_string(doc_val).unwrap();
        let doc: mongodb::bson::Document = mongodb::bson::from_slice(doc_str.as_bytes())
            .map_err(|e| e.to_string())?;
        collection.insert_one(doc, None).await.map_err(|e| e.to_string())?;
        affected_rows = 1;
    }
    
    Ok(super::connection::QueryResult {
        rows: json_rows,
        affected_rows,
    })
}
