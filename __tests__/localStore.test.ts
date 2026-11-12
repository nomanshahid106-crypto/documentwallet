import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LocalDocument, loadDocs, saveDocs, upsertDoc, removeDoc,
  getLastSync, setLastSync, mergeServerDocs,
} from '../src/lib/localStore';
import type { DocumentItem } from '../src/services/documents';

// In-memory AsyncStorage stub (the real module is a native module).
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  const api = {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => { store.set(k, v); },
    removeItem: async (k: string) => { store.delete(k); },
    __store: store,
  };
  return { __esModule: true, __store: store, default: api };
});
const memStore = (AsyncStorage as any).__store as Map<string, string>;

const server = (p: Partial<DocumentItem>): DocumentItem => ({
  id: 'srv-1', owner_id: 'u1', doc_code: 'AAAA-1111', name: 'Passport.pdf', category: 'Personal',
  file_type: 'pdf', mime_type: 'application/pdf', size_bytes: 100, storage_path: 'u1/x/Passport.pdf',
  created_at: '2026-01-01T10:00:00.000Z', updated_at: '2026-01-01T10:00:00.000Z', ...p,
});
const local = (p: Partial<LocalDocument>): LocalDocument => ({
  ...server(p as Partial<DocumentItem>), syncStatus: 'synced', localUri: null, ...p,
});

beforeEach(() => { memStore.clear(); });

describe('AsyncStorage persistence', () => {
  it('round-trips docs per user', async () => {
    const docs = [local({ id: 'a' }), local({ id: 'b', syncStatus: 'pending', storage_path: null })];
    await saveDocs('u1', docs);
    expect(await loadDocs('u1')).toEqual(docs);
    expect(await loadDocs('someone-else')).toEqual([]);
  });
  it('upsert inserts then updates by id', async () => {
    await upsertDoc('u1', local({ id: 'a', name: 'One.pdf' }));
    await upsertDoc('u1', local({ id: 'a', name: 'Renamed.pdf' }));
    const docs = await loadDocs('u1');
    expect(docs).toHaveLength(1);
    expect(docs[0].name).toBe('Renamed.pdf');
  });
  it('removeDoc removes only that id', async () => {
    await saveDocs('u1', [local({ id: 'a' }), local({ id: 'b' })]);
    await removeDoc('u1', 'a');
    expect((await loadDocs('u1')).map(d => d.id)).toEqual(['b']);
  });
  it('loadDocs survives corrupt JSON', async () => {
    memStore.set('docvault.docs.u1', '{not json');
    expect(await loadDocs('u1')).toEqual([]);
  });
  it('last sync time round-trips and is per-user', async () => {
    expect(await getLastSync('u1')).toBeNull();
    await setLastSync('u1', '2026-01-02T00:00:00.000Z');
    expect(await getLastSync('u1')).toBe('2026-01-02T00:00:00.000Z');
    expect(await getLastSync('u2')).toBeNull();
  });
});

describe('mergeServerDocs', () => {
  it('adds server rows that are not local yet, as synced', () => {
    const out = mergeServerDocs([], [server({ id: 's1' }), server({ id: 's2', doc_code: 'BBBB-2222' })]);
    expect(out).toHaveLength(2);
    expect(out.every(d => d.syncStatus === 'synced' && d.localUri === null)).toBe(true);
  });
  it('server row replaces the matching local entry but keeps the local file copy', () => {
    const out = mergeServerDocs(
      [local({ id: 's1', name: 'Old name.pdf', localUri: 'file:///docs/a.pdf' })],
      [server({ id: 's1', name: 'New name.pdf' })],
    );
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('New name.pdf');
    expect(out[0].localUri).toBe('file:///docs/a.pdf');
    expect(out[0].syncStatus).toBe('synced');
  });
  it('drops synced local entries that were deleted on another device', () => {
    const out = mergeServerDocs([local({ id: 'gone' }), local({ id: 's1' })], [server({ id: 's1' })]);
    expect(out.map(d => d.id)).toEqual(['s1']);
  });
  it('always keeps pending and failed entries that are not on the server', () => {
    const out = mergeServerDocs(
      [local({ id: 'local-1', syncStatus: 'pending', storage_path: null }),
       local({ id: 'local-2', syncStatus: 'failed', storage_path: null })],
      [],
    );
    expect(out.map(d => d.id).sort()).toEqual(['local-1', 'local-2']);
    expect(out.map(d => d.syncStatus).sort()).toEqual(['failed', 'pending']);
  });
  it('adopts the server row when a pending entry\'s doc_code already exists server-side', () => {
    // Simulates: the insert actually went through, then the app was killed
    // before it could record the server id locally.
    const out = mergeServerDocs(
      [local({ id: 'local-9', doc_code: 'CODE-9999', syncStatus: 'pending', storage_path: null, localUri: 'file:///docs/x.pdf' })],
      [server({ id: 'srv-9', doc_code: 'CODE-9999', storage_path: 'u1/y/x.pdf' })],
    );
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('srv-9');
    expect(out[0].storage_path).toBe('u1/y/x.pdf');
    expect(out[0].syncStatus).toBe('synced');
    expect(out[0].localUri).toBe('file:///docs/x.pdf');
  });
  it('keeps a pending rename\'s local (newer) name over the server copy', () => {
    const out = mergeServerDocs(
      [local({ id: 's1', name: 'Renamed.pdf', pendingRename: true })],
      [server({ id: 's1', name: 'Original.pdf' })],
    );
    expect(out[0].name).toBe('Renamed.pdf');
    expect(out[0].pendingRename).toBe(true);
  });
  it('keeps a tombstone while the server still has the row, drops it when the row is gone', () => {
    const tomb = local({ id: 's1', pendingDelete: true, localUri: null });
    expect(mergeServerDocs([tomb], [server({ id: 's1' })]).map(d => d.id)).toEqual(['s1']);
    expect(mergeServerDocs([tomb], [])).toEqual([]);
  });
  it('returns results newest-first', () => {
    const out = mergeServerDocs([], [
      server({ id: 'old', doc_code: 'OLD0-0001', created_at: '2026-01-01T00:00:00.000Z' }),
      server({ id: 'new', doc_code: 'NEW0-0002', created_at: '2026-03-01T00:00:00.000Z' }),
    ]);
    expect(out.map(d => d.id)).toEqual(['new', 'old']);
  });
});
