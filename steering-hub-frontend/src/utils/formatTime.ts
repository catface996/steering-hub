/**
 * 格式化时间为统一格式：2026/3/24 23:38:49
 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}:${ss}`;
}

/**
 * 仅格式化日期：2026/3/24
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}
