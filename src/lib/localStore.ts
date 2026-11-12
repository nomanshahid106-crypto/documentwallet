import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DocumentItem } from '../services/documents';

/**
 * On-device document store (offline-first).
 *
 * Every document the user can see is kept here, keyed per user in
 * AsyncStorage. The actual file bytes live in the app's document directory
 * (see `localUri`); this store only holds the metadata + sync state so the
 * app works fully offline and can finish uploads when connectivity returns.
 */
export type SyncStatus = 'synced' | 'pending' | 'failed';
export interface LocalDocument extends Omit<DocumentItem, 'storage_path'> {
  /** Server storage path — null until the file has been uploaded. */
  storage_path: string | null;
  syncStatus: SyncStatus;
  /** On-device copy of the file (offline cache), or null if not downloaded yet. */
  localUri: string | null;
  /** Deleted locally while offline; hidden everywhere until the delete syncs. */
  pendingDelete?: boolean;
  /** Renamed locally; the new name still needs to be PATCHed to the server. */
  pendingRename?: boolean;
}

const docsKey = (userId: string) => `docvault.docs.${userId}`;
const lastSyncKey = (userId: string) => `docvault.lastSync.${userId}`;

export async function loadDocs(userId: string): Promise<LocalDocument[]> {
  try {
    const raw = await AsyncStorage.getItem(docsKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalDocument[]) : [];
  } catch { return []; }
}
export async function saveDocs(userId: string, docs: LocalDocument[]): Promise<void> {
  try { await AsyncStorage.setItem(docsKey(userId), JSON.stringify(docs)); } catch { /* storage full etc. — in-memory state still works for this session */ }
}
export async function upsertDoc(userId: string, doc: LocalDocument): Promise<LocalDocument[]> {
  const docs = await loadDocs(userId);
  const i = docs.findIndex(d => d.id === doc.id);
  if (i >= 0) docs[i] = doc; else docs.push(doc);
  await saveDocs(userId, docs);
  return docs;
}
export async function removeDoc(userId: string, id: string): Promise<LocalDocument[]> {
  const docs = (await loadDocs(userId)).filter(d => d.id !== id);
  await saveDocs(userId, docs);
  return docs;
}
export async function getLastSync(userId: string): Promise<string | null> {
  try { return await AsyncStorage.getItem(lastSyncKey(userId)); } catch { return null; }
}
export async function setLastSync(userId: string, iso: string): Promise<void> {
  try { await AsyncStorage.setItem(lastSyncKey(userId), iso); } catch { /* non-fatal */ }
}

/**
 * Merge the authoritative server list into the local store.
 *
 * Rules:
 * - A server row replaces the matching synced local entry (the local file
 *   copy `localUri` is preserved). If that entry has a rename still waiting
 *   to sync, the local (newer) name wins.
 * - Local entries whose upload hasn't completed ('pending'/'failed') are
 *   always kept — except when a server row carries the same `doc_code`,
 *   which means an earlier insert actually went through (e.g. the app was
 *   killed mid-upload): the entry then adopts the server row and is synced.
 * - Synced local entries that no longer exist on the server were deleted
 *   on another device → dropped locally.
 * - Tombstones (pendingDelete) stay while the server still has the row;
 *   once the row is gone server-side, the tombstone is dropped too.
 * - Server rows with no local entry are added as synced.
 *
 * Result is sorted newest-first (created_at descending).
 */
export function mergeServerDocs(local: LocalDocument[], server: DocumentItem[]): LocalDocument[] {
  const serverById = new Map(server.map(d => [d.id, d]));
  const serverByCode = new Map(server.map(d => [d.doc_code, d]));
  const seen = new Set<string>();
  const out: LocalDocument[] = [];
  for (const l of local) {
    if (l.pendingDelete) {
      if (serverById.has(l.id)) { out.push(l); seen.add(l.id); }
      continue;
    }
    if (l.syncStatus === 'pending' || l.syncStatus === 'failed') {
      const adopted = serverByCode.get(l.doc_code);
      if (adopted && adopted.id !== l.id) {
        seen.add(adopted.id);
        out.push({ ...adopted, syncStatus: 'synced', localUri: l.localUri });
      } else {
        if (adopted) seen.add(adopted.id);
        out.push(l);
      }
      continue;
    }
    const s = serverById.get(l.id);
    if (!s) continue; // deleted elsewhere
    seen.add(s.id);
    const merged: LocalDocument = { ...s, syncStatus: 'synced', localUri: l.localUri, pendingRename: l.pendingRename };
    if (l.pendingRename) merged.name = l.name; // local rename is newer than the server's copy
    out.push(merged);
  }
  for (const s of server) {
    if (!seen.has(s.id)) out.push({ ...s, syncStatus: 'synced', localUri: null });
  }
  return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
}
