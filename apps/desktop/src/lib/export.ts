import { toSqlLiteral, escapeIdentifier } from './sql';

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportRowsAsJson(rows: Record<string, unknown>[], filename: string) {
  downloadBlob(filename, JSON.stringify(rows, null, 2), 'application/json');
}

export function exportRowsAsCsv(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) {
    downloadBlob(filename, '', 'text/csv');
    return;
  }
  const columns = Object.keys(rows[0]);
  const escapeCsv = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = Array.isArray(v) ? JSON.stringify(v) : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    columns.join(','),
    ...rows.map((row) => columns.map((c) => escapeCsv(row[c])).join(',')),
  ];
  downloadBlob(filename, lines.join('\n'), 'text/csv');
}

export function exportRowsAsSqlInserts(rows: Record<string, unknown>[], tableName: string, filename: string) {
  if (rows.length === 0) {
    downloadBlob(filename, '', 'text/plain');
    return;
  }
  const columns = Object.keys(rows[0]);
  const colList = columns.map(escapeIdentifier).join(', ');
  const statements = rows.map((row) => {
    const values = columns.map((c) => toSqlLiteral(row[c])).join(', ');
    return `INSERT INTO ${escapeIdentifier(tableName)} (${colList}) VALUES (${values});`;
  });
  downloadBlob(filename, statements.join('\n'), 'text/plain');
}
