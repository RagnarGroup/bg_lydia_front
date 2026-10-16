// LYD-91: export de leads del embudo a CSV. Separador ";" y BOM UTF-8 para
// que Excel en espanol lo abra en columnas y con tildes bien, sin importar
// nada a mano. Sin imports con alias "@/" (testeable desde tests/*.test.mjs).

export type CsvCell = string | number | null | undefined;

function escapeCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  // Evita que Excel interprete un valor como formula (=, @, o +/- seguido de
  // algo que no sea numero). Telefonos tipo "+51 999..." quedan intactos.
  if (/^[=@]|^[+-](?![\d\s])/.test(text)) text = `'${text}`;
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(header: string[], rows: CsvCell[][]): string {
  const lines = [header, ...rows].map((row) => row.map(escapeCell).join(";"));
  return `﻿${lines.join("\r\n")}\r\n`;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
