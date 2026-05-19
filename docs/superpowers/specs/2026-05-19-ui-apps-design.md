# Spec: Desktop & Mobile Apps UI Layout (DataViewer)

## 1. Overview & Goals
Mục tiêu của Phase 3 là thiết lập và xây dựng giao diện người dùng (UI) cho cả hai ứng dụng:
- **Desktop**: Tauri + React + Vite + Tailwind CSS v3 + Iconsax.
- **Mobile**: Expo + React Native + Nativewind + Expo Router + Iconsax.

Cả hai ứng dụng sẽ chia sẻ trạng thái chung thông qua Zustand stores (được định nghĩa trong `@db-client/core`) và sử dụng chung phong cách giao diện tối phong cách Glassmorphism.

## 2. Design Tokens & Theme Configuration (Glassmorphism Dark Sleek)
Chúng ta sẽ sử dụng bảng màu không gian tối sâu (Deep Space Dark) với các hiệu ứng kính mờ và màu nhấn neon phát sáng (glowing):

- **Bảng màu (Colors)**:
  - Background chính: `#030014` (Deep Purple/Black)
  - Card/Sidebar Surface: `rgba(15, 12, 30, 0.4)` với `backdrop-filter: blur(12px)`
  - Accent Color: Indigo (`#6366f1`) và Sky Blue (`#38bdf8`)
  - Border: Thạch anh mờ `rgba(255, 255, 255, 0.08)` hoặc `rgba(99, 102, 241, 0.15)`

- **Hiệu ứng Glow (Bóng mờ phát sáng)**:
  - Lớp đổ bóng: `shadow-[0_0_15px_rgba(99,102,241,0.25)]`

- **Font chữ**:
  - Giao diện chung: Outfit / Inter
  - Khung soạn thảo (SQL/JSON): Fira Code / JetBrains Mono

## 3. Desktop Application Layout (Tauri + React)
Ứng dụng desktop bao gồm các phân vùng chính:

- **Sidebar (Menu điều hướng & Schema Browser)**:
  - Danh sách các cấu hình kết nối đã lưu (từ `connectionStore`).
  - Danh sách bảng, view của cơ sở dữ liệu đang kết nối hiện tại.
- **Workspace Editor**:
  - Sử dụng Monaco Editor tích hợp để soạn thảo SQL.
  - Quản lý tab để người dùng có thể mở nhiều phiên truy vấn cùng lúc.
- **Result Panel**:
  - Hiển thị kết quả dưới dạng bảng lưới dữ liệu (Sử dụng bảng tối giản có phân trang, hỗ trợ cuộn mượt).

## 4. Mobile Application Layout (Expo + React Native)
Giao diện Mobile được thiết kế gọn gàng, tối ưu diện tích hiển thị nhỏ:

- **Navigation (Expo Router)**:
  - `/index`: Trang chính hiển thị danh sách các Connection Profiles cùng nút thêm mới kết nối.
  - `/connection/[id]`: Trang Workspace chứa trình biên dịch, schema explorer và danh sách các truy vấn đã lưu.
- **Query Editor**:
  - Trình soạn thảo sử dụng CodeMirror phiên bản di động, tối ưu hóa bàn phím ảo.
- **Result Sheet**:
  - Bottom sheet có thể kéo mở lên/xuống hiển thị danh sách kết quả (sử dụng Shopify FlashList để tải dữ liệu lớn mượt mà).

## 5. Iconsax Integration
- **Desktop**: Cài đặt thư viện `iconsax-react` để hiển thị các biểu tượng cấu hình, cơ sở dữ liệu, lịch sử và AI.
- **Mobile**: Cài đặt thư viện `iconsax-react-native` (hoặc vector icons tương ứng) phục vụ giao diện mobile.
