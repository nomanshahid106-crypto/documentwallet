import { filterDocuments } from '../src/lib/search';
import type { DocumentItem } from '../src/services/documents';
const d = (p: Partial<DocumentItem>): DocumentItem => ({ id: Math.random().toString(), owner_id: 'u', doc_code: 'A7F3-9K2D', name: 'Passport.pdf', category: 'Personal', file_type: 'pdf', mime_type: 'application/pdf', size_bytes: 10, storage_path: 'u/x/Passport.pdf', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...p });
const docs = [d({}), d({ name: 'NIC.jpg', file_type: 'jpg', doc_code: 'B2C3-D4E5', category: 'Personal' }), d({ name: 'Resume.pdf', category: 'Work', doc_code: 'C3D4-E5F6' })];
describe('filterDocuments', () => {
  it('searches by name, code and folder', () => { expect(filterDocuments(docs,'passport')).toHaveLength(1); expect(filterDocuments(docs,'b2c3')).toHaveLength(1); expect(filterDocuments(docs,'work')).toHaveLength(1); });
  it('filters by chip', () => { expect(filterDocuments(docs,'','PDFs')).toHaveLength(2); expect(filterDocuments(docs,'','Images')).toHaveLength(1); expect(filterDocuments(docs,'','All')).toHaveLength(3); });
  it('filters by folder', () => { expect(filterDocuments(docs,'','All','Work')).toHaveLength(1); });
  it('returns all on empty query', () => { expect(filterDocuments(docs,'  ')).toHaveLength(3); });
});
