import ExpoModulesCore

// Thin bridge between the JS db-native module and the shared-rust crate, generated as a
// Swift binding by `uniffi-bindgen` (see ios/generated/shared_rust.swift).
//
// NOT built/verified on this (Windows) machine — there is no Xcode/macOS toolchain available.
// To finish wiring this up on macOS:
//   1. Cross-compile shared-rust for iOS targets, e.g. via `cargo build --release --target aarch64-apple-ios`
//      (and `aarch64-apple-ios-sim` / `x86_64-apple-ios` for simulators), then package the
//      resulting libraries into an XCFramework.
//   2. Add the XCFramework to ios/ and reference it from db-native.podspec.
//   3. `cd apps/mobile/ios && pod install`, then build via Xcode / `expo run:ios`.
public class DbNativeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DbNative")

    AsyncFunction("connect") { (dbType: String, connectionString: String) -> String in
      try connect(dbType: dbType, connectionString: connectionString)
    }

    AsyncFunction("disconnect") { (connectionId: String) -> Void in
      try disconnect(connectionId: connectionId)
    }

    AsyncFunction("executeQuery") { (connectionId: String, query: String) -> [String: Any] in
      let result = try executeQuery(connectionId: connectionId, query: query)
      return [
        "rows": result.rows,
        "affectedRows": result.affectedRows
      ]
    }

    AsyncFunction("getSchema") { (connectionId: String) -> [String: Any] in
      let schema = try getSchema(connectionId: connectionId)
      return [
        "tables": schema.tables.map { table in
          [
            "name": table.name,
            "columns": table.columns.map { col in
              [
                "name": col.name,
                "dataType": col.dataType,
                "isPrimary": col.isPrimary,
                "isNullable": col.isNullable
              ]
            }
          ]
        }
      ]
    }
  }
}
