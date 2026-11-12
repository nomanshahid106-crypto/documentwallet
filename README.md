# DocVault

**Your Documents, Always Safe — Save • Organize • Access Anywhere**

A clean, monochrome (white/black, light + dark) React Native + Expo app for storing, organizing and retrieving personal documents from any device. Design follows the user's collected UI samples exactly: Light `#FFFFFF` / black text, Dark `#121212` / white text, no accent colour.

## Stack
React Native (Expo SDK 52, RN 0.76, TypeScript strict) + Expo Router 4 · Supabase Auth · Supabase PostgreSQL · Supabase Storage (private bucket) · expo-camera (scan), expo-document-picker / expo-image-picker (upload), expo-local-authentication (biometric unlock), expo-secure-store (session).

> Backend is **Supabase** per the written spec. (The sample design sheet's footer mentioned Firebase — that was not followed.)

## Setup
1. Install dependencies: `npm install`
2. The connected Supabase project's URL and publishable (anon) key are embedded in `src/lib/supabase.ts` as fallbacks, so the app works out of the box with no `.env`. To point the app at a *different* Supabase project, copy `.env.example` to `.env` and fill in:
   - `EXPO_PUBLIC_SUPABASE_URL` — Project Settings → API → Project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API → anon / publishable key
   - The URL and publishable key are public client credentials by design; data is protected by Row Level Security. **Never** put the `service_role` / secret key in the app, the `.env`, or anywhere in this repo.
3. Run: `npx expo start -c` (then open in Expo Go / a dev build). The `-c` clears Metro's cache so env/config changes are picked up.

## Supabase project creation
1. Go to supabase.com → New project (sign in yourself; no credentials are ever shared in chat).
2. In the dashboard open **SQL Editor**, paste the whole of `supabase/schema.sql`, and run it once. It creates:
   - `public.documents` table (name, unique `doc_code` like `A7F3-9K2D`, owner, folder/category, file type, size (≤ 25 MB check), storage path, timestamps) + owner/date and search indexes
   - Row Level Security with owner-only SELECT / INSERT / UPDATE / DELETE policies (`owner_id = auth.uid()`)
   - A **private** storage bucket `user-documents` with storage policies that only allow access inside your own `{user_id}/…` folder
3. **Authentication → Providers → Email**: enabled by default. For the "Continue with Google" button, enable the Google provider there and add your Google OAuth client ID/secret (the app already calls `supabase.auth.signInWithOAuth({ provider: 'google' })` — until the provider is configured, that button returns Supabase's provider error).
4. **Authentication → URL Configuration**: add `docvault://login` as a redirect URL so password-reset and OAuth deep links return to the app.

## How to run / verify
- `npm run typecheck` — TypeScript, must be clean
- `npm test` — Jest unit tests (doc codes, validation, formatting, search/filter)
- `npx expo export --platform android` — production bundle check

## Second-device sync test checklist
- [ ] Sign up on Device A, upload a PDF and a photo, note their codes
- [ ] Install/open the app on Device B, sign in with the same account
- [ ] Confirm both documents appear automatically on B (Home → Recent Files and Files tab)
- [ ] Rename a document on B → refresh on A → new name shows
- [ ] Delete a document on A → refresh on B → it is gone there too
- [ ] Sign out on B → confirm you are returned to Login and cannot open any document
- [ ] Create a second account → confirm none of the first account's documents are visible (RLS)

## Offline & sync
DocVault is **offline-first**: the phone is not just a window onto the cloud, it keeps its own copy of everything.

- **Saved on the phone first.** When you add a document, the file is copied into the app's own storage and recorded in a local index (AsyncStorage) *before* anything is uploaded. A document added with no internet is fully saved — it shows in Home, Files and Search with an "On this phone — will upload when online" note.
- **Full offline use.** Lists, folders, search and details all work with no connection. A document whose file is on the phone opens, previews and shares offline. Synced documents you open or download are also kept on the phone, so they work offline afterwards. (A document that exists only in the cloud and was never opened on this phone needs one online visit to fetch it.)
- **Automatic upload.** A background sync engine watches the connection: when the internet comes back, when the app returns to the foreground, when you sign in, or when you tap **Sync Now** on the Cloud tab, everything queued — uploads, renames and deletes — is pushed to Supabase. Failed uploads are marked and retried automatically.
- **Coming back online merges, never overwrites carelessly.** When the server list refreshes, it is merged with the local index: new documents from your other devices appear, documents deleted elsewhere disappear, and anything still waiting to upload (or renamed offline) is preserved.
- **Cloud tab shows the truth.** Connection (Online/Offline), how many documents are synced, how many are pending, when the last successful sync happened, and a Sync Now button.
- **Deleting offline works too.** The document disappears immediately and the cloud copy is deleted on the next sync.

## Security model
- **Access:** Supabase Auth (email/password, password reset by email, optional Google). Every document row and storage object is restricted by Row Level Security / storage policies to its owner (`auth.uid()`). Other users cannot list, read, update or delete your files.
- **File access:** files live in a **private** bucket — there are no public URLs. The app opens/previews/downloads through **short-lived signed URLs** (60 s for preview, 5 min for an explicit download/share).
- **Validation:** PDF/JPG/JPEG/PNG/WEBP/HEIC only, max 25 MB — checked in the app and enforced by a database CHECK on size.
- **Session:** stored encrypted via expo-secure-store; logout clears the session. Optional **biometric unlock** gates opening the app on a device where you are already signed in.
- **Login protection ≠ content encryption:** login + biometrics protect *access to the app*. Document contents are encrypted in transit (HTTPS/TLS) and at rest by Supabase, but they are **not end-to-end encrypted** — this distinction is also stated honestly inside Settings → Security.
- **No privileged keys:** only the anon key ships in the app; RLS is the security boundary. The `service_role` key is never used by this project.

## Screens
Welcome/Splash · Login · Sign Up · Forgot Password · Home Dashboard · All Documents (list/grid + folder & type filters) · Add/Upload (photo, gallery, files, scan) · Scan (camera) · Search (name/code/folder) · Document Preview & Details (signed-URL image preview, Open/Download/Share, rename, delete, Copy Code) · Cloud Sync & Upload Status · Settings/Profile · Security & Password (change password, biometric toggle) · Theme Selection (Light / Dark / System, persisted).

Folders: Personal · Work · Finance · Education · Others.
