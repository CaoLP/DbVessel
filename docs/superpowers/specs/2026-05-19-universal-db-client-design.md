# 🗺️ TÀI LIỆU THIẾT KẾ: UNIVERSAL DATABASE CLIENT WITH LOCAL AI AGENT
**Hệ thống quản trị cơ sở dữ liệu đa nền tảng (Desktop & Mobile) độc lập (Standalone), tích hợp trợ lý AI cục bộ bảo mật.**

---

## 1. TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW)

Dự án nhằm xây dựng một ứng dụng quản lý và truy vấn cơ sở dữ liệu đa nền tảng chạy trên cả **PC (Tauri Desktop)** và **Mobile (Expo React Native)**. 
- **Đặc trưng cốt lõi:** 
  - Hoạt động độc lập (Standalone), kết nối trực tiếp (Direct Connection) đến database của người dùng mà không cần thông qua Proxy Server trung gian.
  - Tích hợp trợ lý AI thông minh (Text-to-SQL, tự động sửa lỗi SQL) sử dụng API Key lưu trữ cục bộ (hoặc Local LLM Ollama) đảm bảo an toàn dữ liệu tuyệt đối.
  - Sử dụng chung một lõi kết nối (Database Drivers) viết bằng **Rust** chia sẻ cho cả Desktop và Mobile để tối ưu hóa hiệu năng và bảo trì mã nguồn.
  - Hệ thống icon đồng bộ sử dụng bộ thư viện **Iconsax**.

---

## 2. KIẾN TRÚC MONOREPO (TURBOREPO LAYOUT)

Dự án được xây dựng dưới cấu trúc Turborepo Monorepo để quản lý mã nguồn tập trung:

```text
db-client-monorepo/
├── apps/
│   ├── desktop/             # 💻 Ứng dụng Desktop (Tauri + React + Vite)
│   │   ├── src-tauri/       # Rust Backend của Tauri (gọi thư viện shared-rust)
│   │   └── src/             # Frontend UI (React + Monaco Editor + AG Grid + Iconsax)
│   └── mobile/              # 📱 Ứng dụng Mobile (Expo + React Native)
│       ├── modules/
│       │   └── db-native/   # Expo Native Module cầu nối gọi thư viện shared-rust qua FFI
│       └── src/             # UI/UX Mobile (CodeMirror + FlashList + Iconsax)
├── packages/
│   ├── core/                # 🧠 Zustand Stores, SQL Formatter, AI Prompt Layer (TypeScript)
│   ├── shared-rust/         # ⚙️ Lõi Driver CSDL dùng chung (Rust Library - sqlx, redis, mongodb)
│   └── ui/                  # 🎨 Design System & UI Components dùng chung (Tailwind)
├── package.json
└── turbo.json
```

---

## 3. THIẾT KẾ CÁC MODULE CHI TIẾT

### 3.1. Lõi Kết nối Cơ sở Dữ liệu Dùng chung (packages/shared-rust)
Để hỗ trợ nhiều loại CSDL nhất có thể (PostgreSQL, MySQL, SQLite, MSSQL, Oracle, OceanBase, MongoDB, Redis...) mà không cần server trung gian, toàn bộ logic driver được đóng gói trong một Rust Crate chung.
- **Tauri (Desktop):** Gọi trực tiếp qua dependency `Cargo.toml`.
- **Expo (Mobile):** Biên dịch chéo thành các thư viện tĩnh (`.a` / `.so`) tương thích với chip ARM trên điện thoại và nhúng vào ứng dụng Expo thông qua Expo Modules API và Rust FFI.

```mermaid
graph TD
    subgraph apps/desktop (Tauri)
        DesktopUI[React Frontend] -->|Tauri IPC| TauriRust[Tauri Rust Backend]
    end

    subgraph apps/mobile (Expo)
        MobileUI[React Native UI] -->|Expo Modules API| NativeBridge[Native iOS/Android Bridge]
    end

    subgraph packages/shared-rust (Rust Crate)
        TauriRust -->|Direct Call| SharedRust[Shared Rust Core]
        NativeBridge -->|Rust FFI / UniFFI| SharedRust
        
        SharedRust -->|TCP/Socket| UserDB[(User Database Postgres/MySQL/SQLite/Redis...)]
    end
```

### 3.2. Giao diện & Component Trải nghiệm Người dùng (UI/UX)
- **Hệ thống Icon:** Đồng bộ sử dụng **Iconsax** (`iconsax-react` trên Desktop và `iconsax-react-native` trên Mobile).
- **Desktop UI:** Layout 3 vùng:
  - *Cây thư mục DB (Sidebar Tree)*: Hiển thị các Catalog, Table, View, Column.
  - *SQL Editor*: Tích hợp **Monaco Editor** hỗ trợ autocomplete nâng cao.
  - *Bảng dữ liệu*: **AG Grid React** chịu tải lớn với cuộn ảo (virtualization).
- **Mobile UI:** Layout đáp ứng cảm ứng:
  - *SQL Editor*: **CodeMirror** tối ưu chạm, tích hợp hàng phím tắt từ khóa nhanh (SELECT, FROM, WHERE...).
  - *Bảng dữ liệu*: **Shopify FlashList** cuộn mượt 60 FPS, hỗ trợ bấm vào dòng để mở Card View xem chi tiết.

### 3.3. Quản lý Trạng thái & Bảo mật (State & Security)
- **Zustand Stores (packages/core):**
  - `connectionStore`: Quản lý danh sách máy chủ CSDL đã lưu (không lưu mật khẩu).
  - `queryStore`: Lưu trữ lịch sử câu lệnh truy vấn và SQL Snippets.
  - `aiStore`: Quản lý cấu hình LLM (Model, Provider, Temperature).
- **Lưu trữ khoá bảo mật (Mật khẩu DB & AI API Key):**
  - Tuyệt đối không lưu dạng plaintext.
  - *PC*: Rust gọi crate `keyring` lưu vào Credential Manager (Windows) hoặc Keychain (macOS).
  - *Mobile*: Sử dụng `expo-secure-store` mã hóa phần cứng, có tuỳ chọn mở khoá sinh trắc học (FaceID/Vân tay).

---

## 4. CHIẾN LƯỢC TÍCH HỢP TRỢ LÝ AI (AI AGENT LAYER)

Ứng dụng gọi trực tiếp API của các nhà cung cấp LLM (OpenAI, Gemini, Anthropic) từ thiết bị của người dùng sử dụng API Key lưu trữ cục bộ, hoặc gọi tới Local LLM (Ollama) chạy ở cổng `http://localhost:11434`.
- **Bảo mật**: Chỉ gửi cấu trúc cơ sở dữ liệu (Database Schema Context - không chứa dữ liệu bản ghi) lên LLM phục vụ cho việc tạo câu lệnh SQL từ ngôn ngữ tự nhiên.

---

## 5. LỘ TRÌNH TRIỂN KHAI (ROADMAP)

### 📌 Giai đoạn 1: Thiết lập cấu trúc dự án (Greenfield Monorepo)
- Khởi tạo Turborepo, cấu hình Yarn/NPM Workspaces.
- Tạo các thư mục `apps/desktop`, `apps/mobile`, `packages/core`, `packages/shared-rust`, `packages/ui`.
- Cài đặt cấu hình TypeScript, Linter, và Turborepo pipeline.

### 📌 Giai đoạn 2: Phát triển Rust Core Driver
- Xây dựng crate `shared-rust` tích hợp driver PostgreSQL, MySQL, SQLite sử dụng `sqlx`.
- Viết các test suite độc lập kiểm tra kết nối và thực thi câu lệnh SQL từ Rust.

### 📌 Giai đoạn 3: Hoàn thiện ứng dụng Desktop (Tauri MVP)
- Cấu hình Tauri kết nối với `shared-rust`.
- Xây dựng giao diện React với Monaco Editor, AG Grid, và bộ icon Iconsax.
- Tích hợp tính năng truy vấn CSDL cơ bản.

### 📌 Giai đoạn 4: Hoàn thiện ứng dụng Mobile (Expo MVP)
- Cấu hình công cụ biên dịch chéo Rust cho Android/iOS.
- Xây dựng Expo Module làm cầu nối giữa JavaScript và thư viện Rust compile.
- Phát triển giao diện React Native sử dụng CodeMirror, FlashList và Iconsax.

### 📌 Giai đoạn 5: Tích hợp AI Trợ lý & Mở rộng DB
- Xây dựng `aiStore` và lớp điều phối AI Agent ở package `core`.
- Tích hợp tính năng Text-to-SQL và Fix SQL Error.
- Mở rộng thêm các driver kết nối cho MSSQL, Oracle, MongoDB, Redis.
