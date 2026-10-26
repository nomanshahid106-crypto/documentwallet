import * as FileSystem from 'expo-file-system';
import { supabase, isConfigured, NOT_CONFIGURED_MSG } from '../lib/supabase';
import { generateDocCode } from '../lib/docCode';
import { validateFile } from '../lib/validation';
export interface DocumentItem { id: string; owner_id: string; doc_code: string; name: string; category: string; file_type: string; mime_type: string; size_bytes: number; storage_path: string; created_at: string; updated_at: string }
export const BUCKET = 'user-documents';
function requireClient() { if (!isConfigured || !supabase) throw new Error(NOT_CONFIGURED_MSG); return supabase; }
async function currentUserId(): Promise<string> {
  const sb = requireClient();
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) throw new Error('You are signed out. Please log in again.');
  return data.user.id;
}
export async function listDocuments(): Promise<DocumentItem[]> {
  const sb = requireClient();
  const { data, error } = await sb.from('documents').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DocumentItem[];
}
export async function getDocument(id: string): Promise<DocumentItem | null> {
  const sb = requireClient();
  const { data, error } = await sb.from('documents').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as DocumentItem | null;
}
export async function searchDocuments(query: string): Promise<DocumentItem[]> {
  const all = await listDocuments();
  const q = query.trim().toLowerCase();
  if (!q) return all;
  return all.filter(d => d.name.toLowerCase().includes(q) || d.doc_code.toLowerCase().includes(q) || d.category.toLowerCase().includes(q));
}
export function folderCounts(docs: DocumentItem[], folders: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of folders) out[f] = 0;
  for (const d of docs) if (d.category in out) out[d.category]++;
  return out;
}
function decodeBase64(b64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, '');
  const bytes: number[] = []; let buf = 0; let bits = 0;
  for (const ch of clean) { if (ch === '=') break; const v = chars.indexOf(ch); if (v < 0) continue; buf = (buf << 6) | v; bits += 6; if (bits >= 8) { bits -= 8; bytes.push((buf >> bits) & 0xff); } }
  return new Uint8Array(bytes);
}
export type UploadState = 'validating' | 'uploading' | 'saving' | 'done' | 'error';
export interface UploadInput { uri: string; name: string; sizeBytes: number; mimeType: string; category: string }
export async function uploadDocument(input: UploadInput, onState?: (s: UploadState) => void): Promise<DocumentItem> {
  try {
    onState?.('validating');
    const v = validateFile({ name: input.name, sizeBytes: input.sizeBytes, mimeType: input.mimeType });
    if (!v.ok) throw new Error(v.error);
    const sb = requireClient();
    const userId = await currentUserId();
    const docId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const safeName = input.name.replace(/[^\w.\-]+/g, '_');
    const storagePath = `${userId}/${docId}/${safeName}`;
    onState?.('uploading');
    const b64 = await FileSystem.readAsStringAsync(input.uri, { encoding: FileSystem.EncodingType.Base64 });
    const bytes = decodeBase64(b64);
    const { error: upErr } = await sb.storage.from(BUCKET).upload(storagePath, bytes, { contentType: input.mimeType, upsert: false });
    if (upErr) throw new Error(upErr.message);
    onState?.('saving');
    const row = { owner_id: userId, doc_code: generateDocCode(), name: input.name, category: input.category, file_type: v.extension, mime_type: input.mimeType, size_bytes: input.sizeBytes, storage_path: storagePath };
    const { data, error } = await sb.from('documents').insert(row).select('*').single();
    if (error) { await sb.storage.from(BUCKET).remove([storagePath]).catch(() => {}); throw new Error(error.message); }
    onState?.('done');
    return data as DocumentItem;
  } catch (e) { onState?.('error'); throw e; }
}
export async function getSignedUrl(storagePath: string, expiresIn = 60): Promise<string> {
  const sb = requireClient();
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(storagePath, expiresIn);
  if (error || !data) throw new Error(error?.message ?? 'Could not create a secure link for this file.');
  return data.signedUrl;
}
export async function renameDocument(id: string, name: string): Promise<void> {
  const sb = requireClient();
  const clean = name.trim(); if (!clean) throw new Error('Name cannot be empty.');
  const { error } = await sb.from('documents').update({ name: clean, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}
export async function deleteDocument(doc: DocumentItem): Promise<void> {
  const sb = requireClient();
  const { error: stErr } = await sb.storage.from(BUCKET).remove([doc.storage_path]);
  if (stErr) throw new Error(stErr.message);
  const { error } = await sb.from('documents').delete().eq('id', doc.id);
  if (error) throw new Error(error.message);
}
