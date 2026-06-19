import { requireNativeModule } from 'expo-modules-core';

export interface QueryResult {
  rows: string[];
  affectedRows: number;
}

export interface ColumnNode {
  name: string;
  dataType: string;
  isPrimary: boolean;
  isNullable: boolean;
}

export interface TableNode {
  name: string;
  columns: ColumnNode[];
}

export interface DatabaseSchema {
  tables: TableNode[];
}

interface DbNativeModule {
  connect(dbType: string, connectionString: string): Promise<string>;
  disconnect(connectionId: string): Promise<void>;
  executeQuery(connectionId: string, query: string): Promise<QueryResult>;
  getSchema(connectionId: string): Promise<DatabaseSchema>;
}

// Backed by packages/shared-rust via uniffi-bindgen-generated Kotlin (Android, built and
// wired) / Swift (iOS, code generated but not yet built — see ios/DbNativeModule.swift).
const DbNative = requireNativeModule<DbNativeModule>('DbNative');

export async function connect(dbType: string, connectionString: string): Promise<string> {
  return DbNative.connect(dbType, connectionString);
}

export async function disconnect(connectionId: string): Promise<void> {
  return DbNative.disconnect(connectionId);
}

export async function executeQuery(connectionId: string, query: string): Promise<QueryResult> {
  return DbNative.executeQuery(connectionId, query);
}

export async function getSchema(connectionId: string): Promise<DatabaseSchema> {
  return DbNative.getSchema(connectionId);
}
