Dưới đây là khung sườn (Architecture Blueprint) toàn diện cho ứng dụng của bạn, được thiết kế theo mô hình **Monorepo** sử dụng **Turborepo**. Kiến trúc này giúp bạn chia sẻ tối đa mã nguồn giữa Desktop (Tauri) và Mobile (Expo), đồng thời giải quyết triệt để bài toán kết nối database trên di động thông qua một lớp Proxy siêu nhẹ.

## ---

**1\. Cấu trúc Thư mục Tổng quan (Monorepo Layout)**

Plaintext

db-client-monorepo/  
├── apps/  
│   ├── desktop/             \# 💻 Ứng dụng Desktop (Tauri \+ React \+ Vite)  
│   │   ├── src-tauri/       \# Backend Rust (Xử lý kết nối DB trực tiếp trên Desktop)  
│   │   └── src/             \# Frontend UI (React)  
│   ├── mobile/              \# 📱 Ứng dụng Mobile (Expo \+ React Native)  
│   │   └── src/             \# UI/UX Mobile (Sử dụng FlashList, CodeMirror)  
│   └── proxy-server/        \# 🌐 Proxy Server (Tùy chọn \- Go hoặc Node.js để Mobile kết nối)  
├── packages/  
│   ├── core/                \# 🧠 Logic dùng chung (State, SQL Parser, Formatters)  
│   │   ├── index.ts  
│   │   └── src/  
│   │       ├── store/       \# Zustand Store (Lịch sử query, danh sách connection)  
│   │       └── utils/       \# Hàm format JSON, CSV, định dạng SQL  
│   └── ui/                  \# 🎨 Design System dùng chung (Tùy chọn \- Tailwind/Primitive)  
├── package.json  
└── turbo.json               \# Cấu hình Turborepo

## ---

**2\. Chi tiết các Module Cốt lõi**

### **🧠 Core Module (packages/core)**

Nơi quản lý trạng thái (State Management) toàn cục của ứng dụng. Bạn nên dùng **Zustand** vì nó cực kỳ nhẹ, không boilerplate và chạy mượt mà trên cả React (Webview) lẫn React Native.

* **src/store/connectionStore.ts**: Quản lý danh sách các server đã lưu (Host, Port, User, Mã hóa...).  
* **src/store/queryStore.ts**: Lưu trữ lịch sử các câu lệnh SQL đã chạy (Query History) và danh sách các đoạn code ngắn (Snippets).

### **💻 Ứng dụng Desktop (apps/desktop)**

* **UI Layer (React \+ Tailwind):**  
  * **SQL Editor:** Tích hợp @monaco-editor/react. Cấu hình gợi ý (IntelliSense) dựa trên danh sách Tables/Columns lấy từ database.  
  * **Data Grid:** Sử dụng ag-grid-react hoặc react-data-grid để hiển thị hàng chục ngàn dòng dữ liệu dưới dạng bảng (Virtual Scroll).  
* **Core Connection (Tauri Rust Backend):**  
  * Khi người dùng nhấn "Execute Query", Frontend gửi lệnh qua cổng invoke('execute\_sql', { connectionString, sql }) xuống Rust.  
  * Lớp Rust sử dụng các crate như sqlx hoặc tokio-postgres để kết nối trực tiếp vào database, chạy truy vấn và trả kết quả dạng JSON ngược lên Frontend. Cách này giúp bypass hoàn toàn lớp JavaScript, cho tốc độ xử lý dữ liệu cực nhanh.

### **📱 Ứng dụng Mobile (apps/mobile)**

* **UI Layer (Expo \+ React Native):**  
  * **SQL Editor:** Sử dụng react-native-live-markdown hoặc một wrapper của CodeMirror chạy trong một Webview ẩn để vừa nhẹ vừa có highlight cú pháp.  
  * **Data Grid:** Sử dụng @shopify/flash-list cấu hình cuộn ngang (Horizontal) và cuộn dọc (Vertical). Thiết lập tính năng "Xem chi tiết dòng" (Row Detail View) dưới dạng Card để tối ưu màn hình dọc.  
* **Storage:** Sử dụng expo-secure-store để lưu Token/Password của Database bằng vân tay hoặc FaceID của điện thoại.

### **🌐 Proxy Server (apps/proxy-server) \- *Giải pháp cứu cánh cho Mobile***

Để giải quyết việc Mobile không có sẵn socket TCP thuần và bảo mật, bạn dựng một Proxy Server bằng **Go (Golang)**:

* **Giao tiếp với Mobile:** Qua **WebSocket** (để Stream dữ liệu lớn về điện thoại theo từng block 100 dòng một, tránh treo máy).  
* **Giao tiếp với Database:** Khởi tạo connection pool trực tiếp đến DB của người dùng (PostgreSQL, MySQL, v.v.).

## ---

**3\. Luồng đi của Dữ liệu (Data Flow Diagram)**

### **Luồng 1: Trên Desktop (Kết nối trực tiếp)**

$$\\text{UI (React)} \\xrightarrow{\\text{tauri.invoke()}} \\text{Tauri Core (Rust)} \\xrightarrow{\\text{TCP Socket}} \\text{User Database}$$

### **Luồng 2: Trên Mobile (Qua Proxy)**

$$\\text{Mobile UI (Expo)} \\xrightarrow{\\text{Secure WebSocket}} \\text{Proxy Server (Go)} \\xrightarrow{\\text{Connection Pool}} \\text{User Database}$$

## ---

**4\. Kế hoạch Triển khai theo từng Giai đoạn (Roadmap)**

### **Giai đoạn 1: Xây dựng nền móng (Khởi tạo Monorepo & Core)**

* Khởi tạo dự án với Turborepo.  
* Định nghĩa cấu trúc dữ liệu cho một "Connection Profile" (Postgres, MySQL...).  
* Viết Store quản lý danh sách connection bằng Zustand (lưu tạm ở LocalStorage/AsyncStorage).

### **Giai đoạn 2: Phát triển Desktop MVP (Thực hiện trước vì dễ debug)**

* Build giao diện 3 vùng tiêu chuẩn: Sidebar (Cây thư mục DB) | Giữa (Monaco Editor) | Dưới (Data Grid).  
* Viết các câu lệnh SQL Hệ thống (INFORMATION\_SCHEMA) để cào cấu trúc bảng (Metadata) của Postgres/MySQL về hiển thị lên Sidebar.  
* Hoàn thiện tính năng chạy query và render dữ liệu lưới.

### **Giai đoạn 3: Phát triển Lớp Mobile & Proxy**

* Dựng Proxy Server đơn giản nhận câu lệnh SQL, thực thi và trả về JSON.  
* Build ứng dụng Expo Mobile kết nối tới Proxy qua WebSocket.  
* Tối ưu UI hiển thị dạng Grid trên màn hình cảm ứng nhỏ.

Bạn có muốn đi sâu vào code chi tiết của phần nào trước không, ví dụ như cách cấu hình **Turborepo** cho dự án này hay cách viết các câu lệnh SQL hệ thống để **cào cấu trúc bảng (Metadata)** hiển thị lên cây thư mục?