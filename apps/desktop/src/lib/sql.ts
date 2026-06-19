// Renders a JS value (as decoded from a query result cell) back into a SQL literal.
// No backend parameter binding exists yet (db_execute_query takes a raw SQL string), so
// edits/inserts/deletes are built as literal SQL here — same trust model the rest of this
// MVP already uses for query execution.
export function toSqlLiteral(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return 'NULL';
  }
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) {
    // BLOB columns are decoded as arrays of byte numbers.
    return `X'${value.map((b) => Number(b).toString(16).padStart(2, '0')).join('')}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function escapeIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}
