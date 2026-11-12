import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';
import { supabase, isConfigured, NOT_CONFIGURED_MSG } from '../lib/supabase';
import { generateDocCode } from '../lib/docCode';
import { validateFile } from '../lib/validation';
import { decodeBase64 } from '../lib/base64';
import type { LocalDocument } from '../lib/localStore';
import {
  loadDocs, saveDocs, upsertDoc,
  getLastSync, setLastSync, mergeServerDocs,
} from '../lib/localStore';
export type { LocalDocument, SyncStatus } from '../lib/localStore';
export interface DocumentItem { id: string; owner_id: string; doc_code: string; name: string; category: string; file_type: string; mime_type: string; size_bytes: number; storage_path: string; created_at: string; updated_at: string }
export const BUCKET = 'user-documents';
const LOCAL_DIR = 'docvault-files';
function requireClient() { if (!isConfigured || !supabase) throw new Error(NOT_CONFIGURED_MSG); return supabase; }
async function currentUserId(): Promise<string> {
  const sb = requireClient();
  // getSession() reads the persisted session on-device, so it works offline.
  const { data: s } = await sb.auth.getSession();
  if (s.session?.user) return s.session.user.id;
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) throw new Error('You are signed out. Please log in again.');
  return data.user.id;
}
async function isOnlineNow(): Promise<boolean> {
  try {
    const s = await NetInfo.fetch();
    return s.isConnected === true && s.isInternetReachable !== false;
  } catch { return true; } // if the check itself fails, attempt the request and let it fail naturally
}

// ---------- Change listeners (screens re-render when the local store changes) ----------
type DocsListener = (docs: LocalDocument[]) => void;
const listeners = new Set<DocsListener>();
export function onDocsChanged(cb: DocsListener): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
function visibleDocs(docs: LocalDocument[]): LocalDocument[] {
  return docs.filter(d => !d.pendingDelete).slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
}
async function emitDocs(userId: string): Promise<void> {
  const vis = visibleDocs(await loadDocs(userId));
  listeners.forEach(cb => { try { cb(vis); } catch { /* a broken listener must not break sync */ } });
}

// ---------- Listing / reading ----------
let refreshInFlight: Promise<void> | null = null;
function refreshFromServer(userId: string): Promise<void> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const sb = requireClient();
      const { data, error } = await sb.from('documents').select('*').order('created_at', { ascending: false });
      if (error) return; // offline or server error — local data is already on screen
      const server = (data ?? []) as DocumentItem[];
      const local = await loadDocs(userId);
      const merged = mergeServerDocs(local, server);
      // Only persist + notify when something actually changed (avoids loops).
      if (JSON.stringify(merged) !== JSON.stringify(local)) {
        await saveDocs(userId, merged);
        await emitDocs(userId);
      }
    } catch { /* offline — local data is already on screen */ }
  })().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}
/**
 * Offline-first list: returns what's saved on this phone immediately and
 * refreshes from the server in the background (subscribers are notified
 * via onDocsChanged when newer data lands).
 */
export async function listDocuments(): Promise<LocalDocument[]> {
  requireClient();
  const userId = await currentUserId();
  const local = await loadDocs(userId);
  void refreshFromServer(userId);
  return visibleDocs(local);
}
export async function getDocument(id: string): Promise<LocalDocument | null> {
  requireClient();
  const userId = await currentUserId().catch(() => null);
  if (userId) {
    const docs = await loadDocs(userId);
    const found = docs.find(d => d.id === id && !d.pendingDelete);
    if (found) return found;
  }
  const sb = requireClient();
  const { data, error } = await sb.from('documents').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { ...(data as DocumentItem), syncStatus: 'synced', localUri: null };
}
export async function searchDocuments(query: string): Promise<LocalDocument[]> {
  const all = await listDocuments();
  const q = query.trim().toLowerCase();
  if (!q) return all;
  return all.filter(d => d.name.toLowerCase().includes(q) || d.doc_code.toLowerCase().includes(q) || d.category.toLowerCase().includes(q));
}
export function folderCounts(docs: readonly { category: string }[], folders: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of folders) out[f] = 0;
  for (const d of docs) if (d.category in out) out[d.category]++;
  return out;
}

// ---------- Upload (local first, then push to the cloud) ----------
export type UploadState = 'validating' | 'uploading' | 'saving' | 'done' | 'error';
export interface UploadInput { uri: string; name: string; sizeBytes: number; mimeType: string; category: string }
const safeFileName = (name: string) => name.replace(/[^\w.\-]+/g, '_');
/** Push one locally-saved document to Supabase storage + the documents table. */
async function pushLocalDoc(userId: string, doc: LocalDocument, onState?: (s: UploadState) => void): Promise<LocalDocument> {
  const sb = requireClient();
  if (!doc.localUri) throw new Error('This document has no file saved on this phone.');
  const folderId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const storagePath = `${userId}/${folderId}/${safeFileName(doc.name)}`;
  onState?.('uploading');
  const b64 = await FileSystem.readAsStringAsync(doc.localUri, { encoding: FileSystem.EncodingType.Base64 });
  const bytes = decodeBase64(b64);
  if (bytes.length === 0) throw new Error('File appears empty.');
  const { error: upErr } = await sb.storage.from(BUCKET).upload(storagePath, bytes, { contentType: doc.mime_type, upsert: false });
  if (upErr) throw new Error(upErr.message);
  onState?.('saving');
  const row = { owner_id: userId, doc_code: doc.doc_code, name: doc.name, category: doc.category, file_type: doc.file_type, mime_type: doc.mime_type, size_bytes: bytes.length, storage_path: storagePath };
  const { data, error } = await sb.from('documents').insert(row).select('*').single();
  if (error) { await sb.storage.from(BUCKET).remove([storagePath]).catch(() => {}); throw new Error(error.message); }
  const s = data as DocumentItem;
  return { ...doc, id: s.id, storage_path: s.storage_path, size_bytes: s.size_bytes, created_at: s.created_at, updated_at: s.updated_at, syncStatus: 'synced', pendingRename: undefined };
}
async function replaceDoc(userId: string, oldId: string, next: LocalDocument): Promise<void> {
  const docs = await loadDocs(userId);
  const i = docs.findIndex(d => d.id === oldId);
  if (i >= 0) docs[i] = next; else docs.push(next);
  await saveDocs(userId, docs);
}
/**
 * Offline-first upload: the file is copied into the app's own storage and
 * recorded locally FIRST, so it is never lost. If we're online it is then
 * uploaded right away; if not (or the upload fails) it stays queued with
 * syncStatus 'pending'/'failed' and syncPending() finishes it later.
 * The returned document's syncStatus always tells the truth.
 */
export async function uploadDocument(input: UploadInput, onState?: (s: UploadState) => void): Promise<LocalDocument> {
  let localDoc: LocalDocument;
  try {
    onState?.('validating');
    // Pickers often report no size (DocumentPicker `size` can be undefined).
    // Resolve the real size from the file system before validating, otherwise
    // a valid file is rejected as "empty".
    let sizeBytes = input.sizeBytes;
    if (!sizeBytes || sizeBytes <= 0) {
      const info = await FileSystem.getInfoAsync(input.uri);
      if (!info.exists) throw new Error('That file could not be found on this device. Please pick it again.');
      sizeBytes = (info as any).size ?? 0;
    }
    const v = validateFile({ name: input.name, sizeBytes, mimeType: input.mimeType });
    if (!v.ok) throw new Error(v.error);
    const userId = await currentUserId();
    const localId = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const dir = `${FileSystem.documentDirectory}${LOCAL_DIR}/${localId}/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const localUri = `${dir}${safeFileName(input.name)}`;
    await FileSystem.copyAsync({ from: input.uri, to: localUri });
    const now = new Date().toISOString();
    localDoc = {
      id: localId, owner_id: userId, doc_code: generateDocCode(), name: input.name,
      category: input.category, file_type: v.extension, mime_type: input.mimeType,
      size_bytes: sizeBytes, storage_path: null, created_at: now, updated_at: now,
      syncStatus: 'pending', localUri,
    };
    await upsertDoc(userId, localDoc);
    await emitDocs(userId);
  } catch (e) { onState?.('error'); throw e; }
  // Saved on the phone. Try to push it to the cloud right away when online.
  if (await isOnlineNow()) {
    try {
      const synced = await pushLocalDoc(localDoc.owner_id, localDoc, onState);
      await replaceDoc(localDoc.owner_id, localDoc.id, synced);
      await emitDocs(localDoc.owner_id);
      onState?.('done');
      return synced;
    } catch {
      const failed: LocalDocument = { ...localDoc, syncStatus: 'failed' };
      await upsertDoc(localDoc.owner_id, failed);
      await emitDocs(localDoc.owner_id);
      onState?.('done');
      return failed;
    }
  }
  onState?.('done');
  return localDoc;
}

// ---------- Sync engine backing ----------
let syncInFlight: Promise<void> | null = null;
/** Finish everything queued: uploads, renames, deletes. Safe to call often. */
export function syncPending(): Promise<void> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = doSyncPending().finally(() => { syncInFlight = null; });
  return syncInFlight;
}
async function doSyncPending(): Promise<void> {
  if (!isConfigured || !supabase) return;
  const userId = await currentUserId().catch(() => null);
  if (!userId) return;
  if (!(await isOnlineNow())) return;
  const sb = requireClient();
  let docs = await loadDocs(userId);
  let allOk = true;
  let changed = false;
  const persist = async () => { changed = true; await saveDocs(userId, docs); };
  // 1) Queued uploads, oldest first.
  const queue = docs.filter(d => !d.pendingDelete && d.syncStatus !== 'synced')
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const entry of queue) {
    try {
      const synced = await pushLocalDoc(userId, entry);
      docs = docs.map(d => (d.id === entry.id ? synced : d));
      await persist();
    } catch {
      docs = docs.map(d => (d.id === entry.id ? { ...d, syncStatus: 'failed' as const } : d));
      await persist();
      allOk = false;
      break; // almost certainly lost connectivity — stop and retry next time
    }
  }
  // 2) Queued renames.
  if (allOk) {
    for (const entry of docs.filter(d => d.pendingRename && !d.pendingDelete && d.syncStatus === 'synced')) {
      try {
        const { error } = await sb.from('documents').update({ name: entry.name, updated_at: new Date().toISOString() }).eq('id', entry.id);
        if (error) throw new Error(error.message);
        docs = docs.map(d => (d.id === entry.id ? { ...d, pendingRename: undefined } : d));
        await persist();
      } catch { allOk = false; break; }
    }
  }
  // 3) Queued deletes.
  if (allOk) {
    for (const entry of docs.filter(d => d.pendingDelete)) {
      try {
        if (entry.storage_path) {
          const { error: stErr } = await sb.storage.from(BUCKET).remove([entry.storage_path]);
          if (stErr) throw new Error(stErr.message);
          const { error } = await sb.from('documents').delete().eq('id', entry.id);
          if (error) throw new Error(error.message);
        }
        docs = docs.filter(d => d.id !== entry.id);
        await persist();
      } catch { allOk = false; break; }
    }
  }
  if (changed) await emitDocs(userId);
  if (allOk) await setLastSync(userId, new Date().toISOString());
}
/** How many documents still need something synced (uploads, renames, deletes). */
export async function getPendingCount(): Promise<number> {
  const userId = await currentUserId().catch(() => null);
  if (!userId) return 0;
  const docs = await loadDocs(userId);
  return docs.filter(d => d.pendingDelete || d.pendingRename || d.syncStatus === 'pending' || d.syncStatus === 'failed').length;
}
export async function getLastSyncTime(): Promise<string | null> {
  const userId = await currentUserId().catch(() => null);
  return userId ? getLastSync(userId) : null;
}

// ---------- Opening / downloading ----------
export async function getSignedUrl(storagePath: string, expiresIn = 60): Promise<string> {
  const sb = requireClient();
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(storagePath, expiresIn);
  if (error || !data) throw new Error(error?.message ?? 'Could not create a secure link for this file.');
  return data.signedUrl;
}
/**
 * A URI the app can actually open/share: the on-phone copy when there is
 * one, otherwise the file is downloaded (via a signed URL) into the local
 * cache first — which also makes it available offline from then on.
 */
export async function getReadableUri(doc: LocalDocument): Promise<string> {
  if (doc.localUri) {
    try { const info = await FileSystem.getInfoAsync(doc.localUri); if (info.exists) return doc.localUri; } catch { /* fall through to download */ }
  }
  if (!doc.storage_path || !(await isOnlineNow())) {
    throw new Error('You are offline and this document is not saved on this phone yet.');
  }
  const userId = await currentUserId();
  const signed = await getSignedUrl(doc.storage_path, 300);
  const dir = `${FileSystem.documentDirectory}${LOCAL_DIR}/${doc.id}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const dest = `${dir}${safeFileName(doc.name)}`;
  const dl = await FileSystem.downloadAsync(signed, dest);
  if (dl.status !== 200) throw new Error('Could not download this document. Please try again.');
  const docs = await loadDocs(userId);
  const target = docs.find(d => d.id === doc.id);
  if (target) { await upsertDoc(userId, { ...target, localUri: dl.uri }); await emitDocs(userId); }
  return dl.uri;
}

// ---------- Rename / delete (local first) ----------
export async function renameDocument(id: string, name: string): Promise<void> {
  const sb = requireClient();
  const clean = name.trim(); if (!clean) throw new Error('Name cannot be empty.');
  const userId = await currentUserId().catch(() => null);
  if (userId) {
    const docs = await loadDocs(userId);
    const target = docs.find(d => d.id === id);
    if (target) {
      const updated: LocalDocument = { ...target, name: clean, updated_at: new Date().toISOString() };
      const needsServer = target.syncStatus === 'synced' && !!target.storage_path;
      if (needsServer) updated.pendingRename = true;
      await upsertDoc(userId, updated);
      await emitDocs(userId);
      if (needsServer && (await isOnlineNow())) {
        const { error } = await sb.from('documents').update({ name: clean, updated_at: updated.updated_at }).eq('id', id);
        if (!error) { await upsertDoc(userId, { ...updated, pendingRename: undefined }); await emitDocs(userId); }
        // On error the rename stays queued (pendingRename) for syncPending().
      }
      return;
    }
  }
  // Not in the local store (e.g. first run before any list load) — server-only, as before.
  const { error } = await sb.from('documents').update({ name: clean, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}
export async function deleteDocument(doc: LocalDocument): Promise<void> {
  const sb = requireClient();
  const userId = await currentUserId();
  const docs = await loadDocs(userId);
  const target = docs.find(d => d.id === doc.id) ?? doc;
  // Remove the on-phone copy (it should no longer be readable offline either).
  if (target.localUri) { try { await FileSystem.deleteAsync(target.localUri, { idempotent: true }); } catch { /* best effort */ } }
  if (!target.storage_path) {
    // Never reached the cloud — just drop it locally.
    await saveDocs(userId, docs.filter(d => d.id !== target.id));
    await emitDocs(userId);
    return;
  }
  if (await isOnlineNow()) {
    try {
      const { error: stErr } = await sb.storage.from(BUCKET).remove([target.storage_path]);
      if (stErr) throw new Error(stErr.message);
      const { error } = await sb.from('documents').delete().eq('id', target.id);
      if (error) throw new Error(error.message);
      await saveDocs(userId, docs.filter(d => d.id !== target.id));
      await emitDocs(userId);
      return;
    } catch { /* fall through — queue the delete instead */ }
  }
  // Offline (or the server delete failed): hide it now, delete it on next sync.
  await upsertDoc(userId, { ...target, pendingDelete: true, localUri: null });
  await emitDocs(userId);
}
