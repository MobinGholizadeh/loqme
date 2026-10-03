/** Serialize a spreadsheet cell without allowing text to become a formula. */
export function csvCell(value: string | number | null | undefined): string {
  let text = value == null ? '' : String(value);
  if (typeof value === 'string' && /^[\s]*[=+\-@]/.test(text)) {
    text = "'" + text;
  }
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvRow(values: readonly (string | number | null | undefined)[]): string {
  return values.map(csvCell).join(',');
}
