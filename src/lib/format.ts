export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B','KB','MB','GB']; let v = bytes; let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${i === 0 || Number.isInteger(v) || v >= 10 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}
export function formatDate(iso: string, now: Date = new Date()): string {
  const d = new Date(iso); if (isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
  const sameDay = d.toDateString() === now.toDateString();
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (sameDay) return `Today, ${time}`;
  if (d.toDateString() === y.toDateString()) return `Yesterday, ${time}`;
  return d.toLocaleDateString([], {month: 'short', day: 'numeric', year: 'numeric'});
}
export function fileTypeLabel(ext: string): string {
  const e = ext.toLowerCase();
  if (e === 'pdf') return 'PDF';
  if (['jpg','jpeg','png','webp','heic'].includes(e)) return 'Image';
  return e.toUpperCase();
}
export function categoryForMime(mime?: string, ext?: string): string {
  if (mime?.startsWith('image/') || (ext && ['jpg','jpeg','png','webp','heic'].includes(ext))) return 'Images';
  if (mime === 'application/pdf' || ext === 'pdf') return 'PDFs';
  return 'Documents';
}
export const FOLDERS = ['Personal','Work','Finance','Education','Others'] as const;
export type Folder = typeof FOLDERS[number];
