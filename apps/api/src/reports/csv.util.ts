// Serializacao CSV minima (briefing secao 35: "Tela e CSV" na maioria dos
// relatorios). RFC 4180 o suficiente pro caso de uso -- so aspas quando o
// valor tem virgula, aspas ou quebra de linha.
export interface CsvColumn<T> {
  key: keyof T;
  header: string;
}

function quoteIfNeeded(str: string): string {
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return quoteIfNeeded(value);
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  // Campos como AuditLogRow.metadata sao JSON livre -- serializa como esta.
  return quoteIfNeeded(JSON.stringify(value));
}

export function toCsv<T extends object>(
  rows: T[],
  columns: CsvColumn<T>[],
): string {
  const header = columns.map((c) => escapeCsvValue(c.header)).join(',');
  const lines = rows.map((row) =>
    columns
      .map((c) =>
        escapeCsvValue((row as Record<string, unknown>)[c.key as string]),
      )
      .join(','),
  );
  return [header, ...lines].join('\r\n');
}
