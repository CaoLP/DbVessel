package expo.modules.dbnative

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import uniffi.shared_rust.DbException
import uniffi.shared_rust.connect as rustConnect
import uniffi.shared_rust.disconnect as rustDisconnect
import uniffi.shared_rust.executeQuery as rustExecuteQuery
import uniffi.shared_rust.getSchema as rustGetSchema

// Thin bridge between the JS db-native module and the shared-rust crate, generated as a
// JNA-backed Kotlin binding by `uniffi-bindgen` (see android/src/main/java/uniffi/shared_rust).
class DbNativeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DbNative")

    AsyncFunction("connect") { dbType: String, connectionString: String ->
      try {
        rustConnect(dbType, connectionString)
      } catch (e: DbException) {
        throw DbNativeException(e)
      }
    }

    AsyncFunction("disconnect") { connectionId: String ->
      try {
        rustDisconnect(connectionId)
      } catch (e: DbException) {
        throw DbNativeException(e)
      }
    }

    AsyncFunction("executeQuery") { connectionId: String, query: String ->
      try {
        val result = rustExecuteQuery(connectionId, query)
        mapOf(
          "rows" to result.rows,
          "affectedRows" to result.affectedRows.toLong()
        )
      } catch (e: DbException) {
        throw DbNativeException(e)
      }
    }

    AsyncFunction("getSchema") { connectionId: String ->
      try {
        val schema = rustGetSchema(connectionId)
        mapOf(
          "tables" to schema.tables.map { table ->
            mapOf(
              "name" to table.name,
              "columns" to table.columns.map { col ->
                mapOf(
                  "name" to col.name,
                  "dataType" to col.dataType,
                  "isPrimary" to col.isPrimary,
                  "isNullable" to col.isNullable
                )
              }
            )
          }
        )
      } catch (e: DbException) {
        throw DbNativeException(e)
      }
    }
  }
}

private fun DbNativeException(e: DbException): expo.modules.kotlin.exception.CodedException {
  val message = when (e) {
    is DbException.Generic -> e.details
  }
  return expo.modules.kotlin.exception.CodedException(message, e)
}
