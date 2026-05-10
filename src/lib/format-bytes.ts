/**
 * Форматирование размера файла в человекочитаемый вид.
 * Раньше эта логика дублировалась в tournament-documents-block.tsx и
 * regulations/page.tsx — вынесли в одно место.
 */

/**
 * @param bytes — размер в байтах. Принимает number или string ("12345").
 *                Невалидные значения → "—".
 */
export function formatBytes(bytes: number | string | null | undefined): string {
  if (bytes == null) return "—";
  const n = typeof bytes === "string" ? parseFloat(bytes) : bytes;
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024)              return `${Math.round(n)} B`;
  if (n < 1024 * 1024)       return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Шорткат для процента «использовано N MB из 100 MB». */
export function usagePercent(usedBytes: number, totalBytes: number): number {
  if (totalBytes <= 0) return 0;
  return Math.min(100, Math.round((usedBytes / totalBytes) * 100));
}
