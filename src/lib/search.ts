import type { DocumentItem } from '../services/documents';
export type ChipFilter = 'All' | 'Documents' | 'Images' | 'PDFs';
const IMAGE_EXTS = ['jpg','jpeg','png','webp','heic'];
export function matchesChip(d: DocumentItem, chip: ChipFilter): boolean {
  if (chip === 'All' || chip === 'Documents') return true; // "Documents" = all stored documents
  if (chip === 'PDFs') return d.file_type === 'pdf';
  if (chip === 'Images') return IMAGE_EXTS.includes(d.file_type);
  return true;
}
export function filterDocuments(docs: DocumentItem[], query: string, chip: ChipFilter = 'All', folder?: string): DocumentItem[] {
  const q = query.trim().toLowerCase();
  return docs.filter(d => {
    if (folder && d.category !== folder) return false;
    if (chip === 'Images' && !IMAGE_EXTS.includes(d.file_type)) return false;
    if (chip === 'PDFs' && d.file_type !== 'pdf') return false;
    if (!q) return true;
    return d.name.toLowerCase().includes(q) || d.doc_code.toLowerCase().includes(q) || d.category.toLowerCase().includes(q);
  });
}
