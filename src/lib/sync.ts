import { AppState } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { syncPending } from '../services/documents';

/**
 * Connectivity watcher + auto-sync triggers.
 *
 * The engine keeps a cached "are we online" answer for screens, and calls
 * syncPending() whenever connectivity comes back or the app returns to the
 * foreground — so documents saved offline upload themselves, with no
 * action needed from the user. syncPending() itself is guarded against
 * concurrent runs.
 */
let started = false;
let online = false;
const onlineListeners = new Set<(online: boolean) => void>();

function evalOnline(s: NetInfoState): boolean {
  return s.isConnected === true && s.isInternetReachable !== false;
}
function setOnline(next: boolean) {
  if (next === online) return;
  online = next;
  onlineListeners.forEach(cb => { try { cb(online); } catch { /* ignore listener errors */ } });
}
/** Latest known connectivity (updated continuously once the engine starts). */
export function isOnline(): boolean { return online; }
/** Subscribe to connectivity changes. Returns an unsubscribe function. */
export function subscribeOnline(cb: (online: boolean) => void): () => void {
  onlineListeners.add(cb);
  return () => { onlineListeners.delete(cb); };
}
function trySync() { void syncPending().catch(() => {}); }

export function startSyncEngine(): void {
  if (started) return;
  started = true;
  NetInfo.fetch()
    .then(s => { setOnline(evalOnline(s)); if (online) trySync(); })
    .catch(() => {});
  NetInfo.addEventListener(state => {
    const was = online;
    setOnline(evalOnline(state));
    if (online && !was) trySync(); // back online → flush the queue
  });
  AppState.addEventListener('change', st => { if (st === 'active') trySync(); });
}
