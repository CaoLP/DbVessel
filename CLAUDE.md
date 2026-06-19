# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

DbVessel is a cross-platform universal database client (PostgreSQL, MySQL, SQLite, MongoDB) with:
- **Desktop app** (`apps/desktop`): React + Vite + Tailwind v3, wrapped in Tauri 2 for native access.
- **Mobile app** (`apps/mobile`): Expo + Expo Router + Nativewind.
- **Shared TS core** (`packages/core`): Zustand state stores used by both apps.
- **Shared Rust driver** (`packages/shared-rust`): async DB connection/query/schema logic, linked into the desktop Tauri binary and intended for mobile via UniFFI.

It's an npm-workspaces + Turborepo monorepo, with a parallel Cargo workspace for the Rust pieces.

## Commands

```bash
npm install                              # install all workspace deps

# Desktop
npm run dev --filter=@db-client/desktop  # vite dev server only (no Tauri shell)
npm run tauri dev --workspace=apps/desktop   # full Tauri dev (frontend + Rust backend)
npm run build --filter=@db-client/desktop    # tsc && vite build
npm run tauri build --workspace=apps/desktop # produce native installer

# Mobile
npm run start --filter=@db-client/mobile # expo start
npm run android / ios / web              # platform-specific expo start

# Shared core (the only package with real tests)
npm run test --filter=@db-client/core    # vitest run

# Whole repo (Turborepo fan-out; apps/desktop and apps/mobile have no test script)
npm run build
npm run test

# Rust (run from the relevant crate dir, not wired into npm scripts)
cd packages/shared-rust && cargo build / cargo check / cargo test
cd apps/desktop/src-tauri && cargo build
```

There is no lint script defined anywhere in the repo yet.

## Architecture

**IPC boundary (desktop):** `apps/desktop/src-tauri/src/main.rs` defines four `#[tauri::command]` handlers (`db_connect`, `db_disconnect`, `db_execute_query`, `db_get_schema`) that thinly delegate to the `shared_rust` crate. There is no `commands.rs` — everything lives in `main.rs`.

**Driver layer (`packages/shared-rust`):**
- `lib.rs` only declares `models`, `connection`, `executor` as compiled modules and exposes sync wrapper functions (`connect`, `disconnect`, `execute_query`, `get_schema`) that spin up a fresh `tokio::Runtime` per call via `run_async`.
- `connection.rs` holds a global `lazy_static` connection pool (`RwLock<HashMap<String, AnyPool>>`) keyed by connection id, using `sqlx::Any` — Postgres/MySQL/SQLite are all handled generically through sqlx's "Any" driver rather than per-database modules.
- `executor.rs` runs queries and extracts schema. **Known gap:** row values are currently stubbed to the literal string `"Value_Placeholder"` (not yet doing real `AnyRow` → JSON conversion), and schema extraction only works for SQLite — Postgres/MySQL schema calls return an explicit "not yet implemented" error.
- `mongo_engine.rs` and `sql_engine.rs` exist as files but are **not** declared in `lib.rs`, so they're dead code — MongoDB support is not actually wired up yet despite being a stated goal.
- `shared_rust.udl` defines the UniFFI interface, intended to generate native bindings for mobile.

**Mobile native bridge:** `apps/mobile/modules/db-native` is a local workspace package (matches the `apps/mobile/modules/*` workspace glob) that currently only contains a **hardcoded mock** (`connect`/`disconnect`/`executeQuery` return fake data) — it is not yet hooked up to `shared-rust` via UniFFI. Treat any "mobile can query a database" behavior as unimplemented unless this changes.

**State sharing (`packages/core`):** Zustand stores consumed by both apps:
- `store/connectionStore.ts` — saved `ConnectionProfile`s (host/port/credentials/db type, plus SSH-tunnel fields marked "Phase 5").
- `store/queryStore.ts` — query history (capped at 500 entries) and saved SQL snippets.
- `store/aiStore.ts` — AI-assistant related state.

`packages/ui` is currently an empty scaffold (no source files, no exports) — do not assume shared components exist there yet.

**Planned but not present:** `docs/doc1.md` and `docs/doc2.txt` (in Vietnamese) describe a planned `apps/proxy-server` (Go or Node) to give mobile network-restricted access to databases via gRPC/WebSocket, and an AI layer where API keys are stored locally and calls go client→LLM-provider directly. Neither the proxy server nor the AI layer exists in code yet — check before assuming either is implemented.

## Notes

- `.github/PULL_REQUEST_TEMPLATE.md`, `AGENTS.md`, `GEMINI.md`, and the `.agent/` directory in this repo are leftover scaffolding from an unrelated template (Superpowers plugin) and do not describe DbVessel's actual contribution process.
