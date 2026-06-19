import { escapeIdentifier } from './sql';

export interface DesignerColumn {
  id: string;
  name: string;
  type: string;
  isPrimary: boolean;
  isNotNull: boolean;
  isUnique?: boolean;
  isAutoIncrement?: boolean;
  defaultValue?: string;
  /** References another table's column, e.g. `{ table: 'users', column: 'id' }` */
  foreignKey?: { table: string; column: string } | null;
}

export type DbDialect = 'sqlite' | 'postgres' | 'mysql' | string;

/**
 * Builds a `CREATE TABLE` statement for the given dialect. Each backend handles
 * auto-increment primary keys differently (SQLite: `INTEGER PRIMARY KEY AUTOINCREMENT`,
 * Postgres: `SERIAL`/`BIGSERIAL`, MySQL: `AUTO_INCREMENT` keyword) so this branches per dialect
 * rather than trying to find one syntax that works everywhere.
 */
export function generateCreateTableSql(dialect: DbDialect, tableName: string, columns: DesignerColumn[]): string {
  const pkColumns = columns.filter((c) => c.isPrimary);
  const singleAutoIncrementPk = pkColumns.length === 1 && pkColumns[0].isAutoIncrement ? pkColumns[0] : null;

  const columnDefs = columns.map((col) => {
    const isInlinePk = singleAutoIncrementPk?.id === col.id;
    let type = col.type;

    if (isInlinePk && dialect === 'postgres') {
      type = /big/i.test(col.type) ? 'BIGSERIAL' : 'SERIAL';
    }

    let def = `${escapeIdentifier(col.name)} ${type}`;

    if (isInlinePk) {
      if (dialect === 'sqlite') {
        def += ' PRIMARY KEY AUTOINCREMENT';
      } else if (dialect === 'mysql') {
        def += ' PRIMARY KEY AUTO_INCREMENT';
      } else if (dialect === 'postgres') {
        def += ' PRIMARY KEY';
      } else {
        def += ' PRIMARY KEY';
      }
    } else if (col.isPrimary && pkColumns.length === 1) {
      // Single PK column without auto-increment.
      def += ' PRIMARY KEY';
    }

    if (col.isNotNull && !isInlinePk) def += ' NOT NULL';
    if (col.isUnique && !col.isPrimary) def += ' UNIQUE';
    if (col.defaultValue?.trim()) def += ` DEFAULT ${col.defaultValue.trim()}`;

    return def;
  });

  // Table-level PRIMARY KEY for composite keys (or a single non-auto-increment PK already
  // handled inline above, so only emit this for the composite case).
  if (pkColumns.length > 1) {
    columnDefs.push(`PRIMARY KEY (${pkColumns.map((c) => escapeIdentifier(c.name)).join(', ')})`);
  }

  for (const col of columns) {
    if (col.foreignKey?.table && col.foreignKey?.column) {
      columnDefs.push(
        `FOREIGN KEY (${escapeIdentifier(col.name)}) REFERENCES ${escapeIdentifier(col.foreignKey.table)} (${escapeIdentifier(col.foreignKey.column)})`
      );
    }
  }

  return `CREATE TABLE ${escapeIdentifier(tableName)} (\n  ${columnDefs.join(',\n  ')}\n);`;
}
