# DbVessel — Feature Roadmap (so với Navicat)

Mục đích: liệt kê những gì còn thiếu để DbVessel trở thành một universal database client dùng được thực tế, dùng làm input để break task sau này. Thứ tự nhóm = thứ tự ưu tiên đề xuất.

## A. Lõi kết nối / truy vấn (blocker — phải xong trước mọi thứ khác)

- [x] Convert dữ liệu thật từ row sang JSON trong [executor.rs](../packages/shared-rust/src/executor.rs) — không còn `"Value_Placeholder"`. Có test (`cargo test -p shared-rust`), bao gồm test thật chạy trên Postgres local.
- [x] Schema introspection đầy đủ cho Postgres: bảng, cột, kiểu dữ liệu, PK (qua `information_schema`), nullable. (FK/index/view vẫn chưa có — xem dòng dưới.)
- [x] Schema introspection đầy đủ cho MySQL (tương tự, qua `information_schema`, PK qua `column_key='PRI'`).
- [ ] Schema introspection mở rộng cho SQLite/Postgres/MySQL: vẫn thiếu FK, index, view ở cả 3 dialect (chỉ có bảng + cột + PK + nullable).
- [ ] Wire `mongo_engine.rs` vào `lib.rs` và implement connect/query/schema thật cho MongoDB (hiện file tồn tại nhưng không compile vào crate).
- [ ] Xoá hoặc wire `sql_engine.rs` (hiện là dead code, không rõ mục đích còn cần không).
- [ ] Transaction support qua IPC (`db_begin`, `db_commit`, `db_rollback`) để chạy nhiều câu lệnh trước khi commit.
- [x] **Bug nghiêm trọng đã sửa**: mỗi lệnh gọi backend (`connect`, `execute_query`, `get_schema`...) tự tạo **một Tokio runtime mới rồi huỷ ngay** ([lib.rs](../packages/shared-rust/src/lib.rs), hàm `run_async`) — khiến các connection trong pool bị "mồ côi" (socket gắn với runtime đã chết) ngay sau lệnh `connect`, lệnh tiếp theo dùng pool đó bị treo rồi lỗi `pool timed out while waiting for an open connection`. Đã sửa: dùng 1 runtime sống suốt vòng đời app (`lazy_static`).
- [x] **🔴 → ✅ Đã fix vấn đề kiến trúc nghiêm trọng**: `sqlx::Any` (driver dùng chung cho cả 3 DB, dùng từ đầu dự án) trong `sqlx 0.7.4` chỉ decode được **8 kiểu Postgres**: `void, int2, int4, int8, float4, float8, bytea, text/varchar`. Mọi kiểu khác — `boolean`, `timestamp`, `numeric`, `uuid`, `jsonb`, `date`... — fail hoàn toàn ngay ở bước đọc metadata cột, nghĩa là **bất kỳ bảng Postgres thực tế nào có cột boolean/timestamp/numeric đều không SELECT được trước đây**. Đã **bỏ hẳn `sqlx::Any`**, chuyển `connection.rs`/`executor.rs` sang driver gốc riêng từng loại DB (`DbPool` enum bọc `PgPool`/`MySqlPool`/`SqlitePool`), mỗi loại tự decode đầy đủ kiểu dữ liệu native (thêm `chrono`/`uuid`/`json`/`bigdecimal` cho Postgres+MySQL). Đã verify bằng test thật chạy trên Postgres local: bool/timestamp/numeric/uuid/jsonb đều decode đúng (`native_postgres_driver_decodes_bool_timestamp_numeric_uuid_json` trong executor.rs). Cũng đơn giản hoá lại được SQL (bỏ các cast `::text`/`::int` workaround đã thêm tạm trước đó, vì driver native decode `name`/`bool` trực tiếp không cần ép kiểu).
- [ ] Connection pooling/timeout/retry hợp lý theo từng loại DB.
- [ ] Error mapping chi tiết hơn — hiện `DbError` chỉ có 1 variant `Generic { details }`, nên tách theo loại lỗi (connection failed, syntax error, constraint violation...) để FE hiển thị tốt hơn.
- [x] ~~Bug: `pool.any_kind()`/`AnyKind::Sqlite` không compile được~~ — đã fix khi làm UniFFI mobile MVP: `sqlx-core 0.7.4` thực ra không định nghĩa feature `postgres/mysql/sqlite` ở cấp `sqlx-core` (chỉ cấp `sqlx` mới có), nên cfg gate gốc không bao giờ true. Thay bằng `DbKind` tự suy ra từ scheme connection string ([connection.rs](../packages/shared-rust/src/connection.rs)). Đồng thời đổi `runtime-tokio-native-tls` → `runtime-tokio-rustls` để cross-compile Android (NDK) không cần OpenSSL hệ thống.

## B. Tính năng cốt lõi của một data tool

- [x] **Editable data grid** ([DataGrid.tsx](../apps/desktop/src/components/DataGrid.tsx)): sửa cell → UPDATE, thêm row → INSERT, xoá row đã chọn → DELETE. Chỉ bật khi truy vấn hiện tại là single-table SELECT (không JOIN) và bảng có PK — phát hiện qua regex `FROM <table>` đơn giản, không phải SQL parser thật nên các câu phức tạp (subquery, alias khác tên bảng...) sẽ fallback về read-only.
- [x] **Thêm dòng — sửa lại flow**: trước đây "Thêm dòng" insert NULL mù cho mọi cột không phải PK ngay lập tức → lỗi `NOT NULL constraint` nếu cột nào đó NOT NULL không có default (vd. FK `source_id`). Giờ bấm "Thêm dòng" chỉ tạo 1 dòng **chưa lưu** trong grid để điền giá trị trước, có nút "Lưu dòng mới"/"Huỷ" riêng — giống Navicat. Cột PK kiểu manual (không autoincrement) cũng điền được nếu cần.
- [x] **Bug đã fix: sửa cell xong dòng "biến mất"** — thực ra không mất dữ liệu, do sau mỗi lần sửa app chạy lại `SELECT ... LIMIT 100` (không có `ORDER BY`) để đồng bộ UI, mà Postgres/MySQL không đảm bảo thứ tự dòng giống nhau giữa các lần chạy cùng 1 câu query (kể cả khi không sửa gì) → dòng nhảy sang vị trí khác, trông như mất. Đã sửa 2 lớp: (1) sửa cell (UPDATE) giờ chỉ patch trực tiếp vào state cục bộ tại đúng vị trí dòng theo PK, không refetch toàn bộ; (2) các câu query "Xem dữ liệu" tự sinh (double-click bảng, menu chuột phải) giờ tự thêm `ORDER BY <khoá chính>` (qua `buildViewQuery` trong App.tsx) để thứ tự ổn định giữa các lần chạy — giống Navicat mặc định sort theo PK. Câu query người dùng tự gõ trong editor thì giữ nguyên, không tự ý chèn ORDER BY.
- [x] **Database explorer tree phân cấp** ([DbExplorerTree.tsx](../apps/desktop/src/components/DbExplorerTree.tsx)): Connection → Schema (`schema_name` mới thêm vào `TableNode`: SQLite="main", Postgres="public", MySQL=tên DB hiện tại) → Table → Column, thay vì cây phẳng table→column trước đây. Có context menu chuột phải trên bảng: Xem dữ liệu, Làm mới schema, Đổi tên bảng, Làm trống bảng (TRUNCATE/DELETE FROM theo dialect), Xoá bảng.
- [x] **Multi-database per connection** (kiểu Navicat): 1 connection = 1 server, không phải 1 database cố định. Backend thêm `list_databases` (`pg_database`/`information_schema.schemata`, catalog server-wide nên không cần đổi pool để liệt kê) và `switch_database` (dựng pool mới trỏ DB khác, thay thế pool cũ cùng `connection_id` — Postgres/MySQL bắt buộc reconnect vì 1 connection chỉ bind 1 database). Sidebar hiện **mỗi database là 1 node riêng trong tree** (không phải dropdown) — bấm vào node nào mới lazy-load schema/bảng của database đó, cache lại theo tên DB ở frontend để mở lại không cần tải lại; chấm xám trên node đánh dấu DB chưa phải pool đang active (sẽ tự reconnect khi bấm xem bảng/chạy hành động trên đó).
- [x] **Table/Schema designer** hoàn thiện ([TableDesignerModal.tsx](../apps/desktop/src/components/TableDesignerModal.tsx) + [ddl.ts](../apps/desktop/src/lib/ddl.ts)): thêm UNIQUE, DEFAULT, AUTO INCREMENT, FOREIGN KEY (chọn bảng/cột tham chiếu từ schema thật). Sinh DDL đúng dialect (SQLite `AUTOINCREMENT`, Postgres `SERIAL`, MySQL `AUTO_INCREMENT`) thay vì hardcode SQLite như trước. Vẫn create-only — chưa có "sửa bảng đã tồn tại" (ALTER TABLE).
- [x] **SQL editor nâng cao** ([EditorPanel.tsx](../apps/desktop/src/components/EditorPanel.tsx)): autocomplete theo schema thật (tên bảng + cột.kiểu dữ liệu) qua Monaco `registerCompletionItemProvider`, kèm SQL keyword cơ bản. Chưa có: autocomplete theo hàm SQL, multi-tab.
- [x] **Export dữ liệu** ([export.ts](../apps/desktop/src/lib/export.ts)): CSV, JSON, SQL INSERT dump — nút "Xuất dữ liệu" trong DataGrid. Chưa có Excel.
- [ ] **Import dữ liệu**: từ CSV/JSON vào bảng có sẵn — chưa làm.
- [x] **Query history UI đầy đủ** ([HistoryPanel.tsx](../apps/desktop/src/components/HistoryPanel.tsx)): search, đánh dấu favorite (field `isFavorite` mới thêm vào `QueryLog`), click để load lại vào editor. Chỉ log các SELECT do người dùng chủ động chạy (không log các re-run nội bộ sau khi edit grid).
- [x] **Saved SQL snippets UI**: tạo/xoá snippet, click để load vào editor (trong cùng `HistoryPanel.tsx`, tab "Snippets"). Chưa có tag/sửa tên sau khi tạo.
- [ ] **Backup/Restore**: dump toàn bộ database ra file SQL và restore lại từ file — chưa làm (export hiện tại chỉ xuất *kết quả query đang xem*, không phải toàn bộ DB).
- [ ] **Connection management UI hoàn chỉnh**: test connection trước khi lưu, duplicate/edit/xoá connection, group theo folder — chưa làm.

## C. Tính năng nâng cao (giai đoạn sau MVP)

- [ ] ER Diagram / visual schema designer (kéo-thả thể hiện quan hệ FK giữa các bảng).
- [ ] Data Sync giữa 2 connection (so sánh và đồng bộ dữ liệu).
- [ ] Schema Compare giữa 2 connection/database (diff DDL).
- [ ] Scheduled jobs / automation — chạy script SQL định kỳ (giống "Automation" của Navicat).
- [ ] User & permission management qua UI (GRANT/REVOKE, tạo role).
- [ ] SSL/TLS connection options cho từng loại DB.
- [ ] Query plan / EXPLAIN visualizer.
- [ ] Charts/report đơn giản từ kết quả query.

## D. SSH Tunnel

- [ ] Implement SSH tunnel thật ở tầng Rust (`connectionStore.ts` đã có field `useSshTunnel/sshHost/sshPort/sshUser/sshKey` đánh dấu "Phase 5" nhưng chưa có logic tunnel nào trong `shared-rust`).

## E. Mobile — kết nối DB thật

- [x] **Android**: UniFFI binding hoàn chỉnh — `cargo-ndk` build `shared-rust` → `.so`, `uniffi-bindgen` sinh Kotlin binding, `DbNativeModule.kt` (Expo Modules API) expose `connect/disconnect/executeQuery/getSchema` thật cho JS. `./gradlew :app:assembleDebug` build thành công (APK debug đã tạo được). Chi tiết & lệnh regenerate: [apps/mobile/modules/db-native/README.md](../apps/mobile/modules/db-native/README.md).
- [ ] **iOS**: Swift binding đã sinh (`uniffi-bindgen --language swift`) và `DbNativeModule.swift` đã viết, nhưng **chưa build/test** — máy hiện tại không có Xcode/macOS. Cần: build `shared-rust` cho các target iOS, đóng gói `.xcframework`, vendor vào `DbNative.podspec`, rồi `pod install` + build trên Mac. Xem mục "iOS: remaining work" trong README trên.
- [ ] Đã loại bỏ phương án `apps/proxy-server` khỏi roadmap ngắn hạn — UniFFI trực tiếp đã chứng minh khả thi cho Android; chỉ cân nhắc proxy-server lại nếu sau này cần hỗ trợ platform/runtime không thể nhúng Rust trực tiếp (vd. web).
- [ ] Sau khi build thật chạy được: fix `executor.rs` trả giá trị placeholder (`"Value_Placeholder"`, mục A) — nếu không, app mobile sẽ "kết nối thật" nhưng vẫn nhận dữ liệu giả qua bridge thật.

## F. AI Layer (theo design doc, chưa có code)

- [ ] Định nghĩa API key storage (local/OS keychain) — `aiStore.ts` hiện chỉ có state rỗng, chưa có logic lưu/đọc key.
- [ ] Tích hợp gọi LLM provider trực tiếp từ client (cloud hoặc local Ollama) theo nguyên tắc privacy đã nêu trong design doc.
- [ ] Tính năng AI cụ thể cần làm rõ trước khi code: AI generate SQL từ natural language? AI giải thích query? AI tối ưu query?

## G. Hạ tầng dev còn thiếu

- [ ] Thêm lint script (ESLint cho TS/JS, clippy cho Rust) — hiện không có lint script nào trong repo.
- [ ] Thêm test script cho `apps/desktop` và `apps/mobile` (hiện chỉ `packages/core` có test).
- [ ] Thêm `cargo test` cho `packages/shared-rust` (hiện chưa thấy test nào trong crate).
- [ ] Build `packages/ui` thật (hiện là scaffold rỗng, không có source file/export nào).
- [ ] Dọn dẹp tài liệu rác còn sót từ template không liên quan: `AGENTS.md`, `GEMINI.md`, `.agent/`, `.github/PULL_REQUEST_TEMPLATE.md`.

---

## Đề xuất thứ tự MVP khả dụng sớm nhất

1. ✅ Nhóm A (data + schema thật cho Postgres/MySQL/SQLite) — xong, có test.
2. ✅ Editable data grid + Export CSV/SQL (nhóm B) — xong.
3. ✅ SQL editor autocomplete theo schema thật + query history UI — xong.
4. ✅ Table designer hoàn thiện (UNIQUE/DEFAULT/AUTO INCREMENT/FK, đúng dialect) — xong.
5. ✅ Mobile (Android) — xong qua UniFFI; iOS còn lại cần máy Mac.
6. Còn lại: Import dữ liệu, Backup/Restore toàn DB, Connection management UI nâng cao (nhóm B); FK/index/view trong schema introspection, transaction support, error mapping chi tiết (nhóm A); và toàn bộ nhóm C/D/F/G.
