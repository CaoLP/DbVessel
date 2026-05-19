# Spec: Shared Rust Core Database Connection Driver

## 1. Overview & Goals
Mục tiêu của Phase 2 là triển khai package `shared-rust` làm thư viện lõi viết bằng Rust. Thư viện này sẽ kết nối trực tiếp đến các cơ sở dữ liệu (PostgreSQL, MySQL, SQLite, MongoDB) không qua proxy trung gian, và xuất bản FFI bindings thông qua **UniFFI** để ứng dụng Mobile (React Native/Expo) và Desktop (Tauri) có thể gọi trực tiếp.

## 2. API Interface (UniFFI Definition)
Chúng ta sẽ khai báo interface FFI qua file cấu hình UniFFI (hoặc macro attribute trực tiếp). Dữ liệu trao đổi dạng JSON string để tối ưu hóa sự tương thích giữa SQL và MongoDB.

### Data Models
```rust
pub enum DbType {
    Postgres,
    Mysql,
    Sqlite,
    Mongodb,
}

pub struct QueryResult {
    pub rows: Vec<String>,       // Mảng chứa các bản ghi được serialize dưới dạng JSON string
    pub affected_rows: u64,      // Số lượng dòng bị ảnh hưởng (cho INSERT/UPDATE/DELETE)
}
```

### Exposing Functions
```rust
// Kết nối đến cơ sở dữ liệu và trả về Connection ID duy nhất
pub async fn connect(db_type: DbType, connection_string: String) -> Result<String, String>;

// Đóng kết nối
pub async fn disconnect(connection_id: String) -> Result<(), String>;

// Thực thi truy vấn (SQL string đối với SQL DB, JSON command string đối với MongoDB)
pub async fn execute_query(connection_id: String, query: String) -> Result<QueryResult, String>;

// Lấy danh sách các bảng/collections và schema tổng quan
pub async fn get_schema(connection_id: String) -> Result<String, String>;
```

## 3. Database Driver Engine (Internal Execution)
Trong mã nguồn Rust, chúng ta sử dụng:
- **`sqlx` (with features `postgres`, `mysql`, `sqlite`, `runtime-tokio-native-tls`)**: Cho các cơ sở dữ liệu quan hệ. Mỗi khi kết nối thành công, Pool kết nối tương ứng sẽ được lưu vào một `dashmap` hoặc `lazy_static` HashMap toàn cục để duy trì session.
- **`mongodb` (async driver)**: Cho NoSQL MongoDB. Client kết nối sẽ được lưu trữ tương tự.

### MongoDB Query Parser
Đối với MongoDB, tham số `query` nhận một JSON string chứa các trường chỉ thị operation và collection:
```json
{
  "collection": "customers",
  "operation": "find",
  "filter": { "status": "active" },
  "limit": 10
}
```
Rust code sẽ parse JSON này và ánh xạ đến các hàm thích hợp của crate `mongodb` (`collection.find()`, `collection.insert_many()`, v.v.) rồi trả về kết quả dưới dạng JSON string.

## 4. Build & Integration Architecture
- **Desktop (Tauri)**: Tauri gọi trực tiếp thư viện Rust thông qua file `Cargo.toml` của Tauri `src-tauri`.
- **Mobile (React Native/Expo)**:
  1. Sử dụng `uniffi-bindgen` sinh ra mã Swift (iOS) và Kotlin (Android).
  2. Compile crate Rust thành static library (`.a` / `.framework`) cho iOS và dynamic library (`.so`) cho Android.
  3. Viết Expo Native Module để giao tiếp với mã Swift/Kotlin đã sinh ra, rồi export các hàm ra JS/TS cho React Native.
