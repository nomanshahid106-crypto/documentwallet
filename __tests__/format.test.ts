import { formatBytes, formatDate, fileTypeLabel, categoryForMime } from '../src/lib/format';
describe('format', () => {
  it('formats bytes', () => { expect(formatBytes(0)).toBe('0 B'); expect(formatBytes(1024)).toBe('1 KB'); expect(formatBytes(2.4*1024*1024)).toContain('MB'); expect(formatBytes(856*1024)).toBe('856 KB'); });
  it('labels types and categories', () => { expect(fileTypeLabel('pdf')).toBe('PDF'); expect(fileTypeLabel('jpg')).toBe('Image'); expect(categoryForMime('application/pdf')).toBe('PDFs'); expect(categoryForMime('image/png')).toBe('Images'); });
  it('formats today dates like the samples', () => { const now = new Date(); const iso = now.toISOString(); expect(formatDate(iso, now)).toMatch(/^Today,/); });
});
