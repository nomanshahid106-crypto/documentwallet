-- DocVault — run once in Supabase Dashboard → SQL Editor. Backend: Supabase (per spec), NOT Firebase.
create extension if not exists pgcrypto;
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  doc_code text not null unique,
  name text not null,
  category text not null default 'Others',
  file_type text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  storage_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists documents_owner_created_idx on public.documents(owner_id, created_at desc);
create index if not exists documents_search_idx on public.documents using gin (to_tsvector('simple', name || ' ' || doc_code || ' ' || category));
alter table public.documents enable row level security;
drop policy if exists "documents_select_own" on public.documents;
drop policy if exists "documents_insert_own" on public.documents;
drop policy if exists "documents_update_own" on public.documents;
drop policy if exists "documents_delete_own" on public.documents;
create policy "documents_select_own" on public.documents for select using (owner_id = auth.uid());
create policy "documents_insert_own" on public.documents for insert with check (owner_id = auth.uid());
create policy "documents_update_own" on public.documents for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "documents_delete_own" on public.documents for delete using (owner_id = auth.uid());
-- Private bucket (never public). Files are served only via short-lived signed URLs.
insert into storage.buckets (id, name, public) values ('user-documents','user-documents', false) on conflict (id) do nothing;
drop policy if exists "user_documents_select_own" on storage.objects;
drop policy if exists "user_documents_insert_own" on storage.objects;
drop policy if exists "user_documents_update_own" on storage.objects;
drop policy if exists "user_documents_delete_own" on storage.objects;
-- Path convention: {user_id}/{doc_id}/{filename} — first folder segment must equal auth.uid()
create policy "user_documents_select_own" on storage.objects for select using (bucket_id = 'user-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "user_documents_insert_own" on storage.objects for insert with check (bucket_id = 'user-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "user_documents_update_own" on storage.objects for update using (bucket_id = 'user-documents' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'user-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "user_documents_delete_own" on storage.objects for delete using (bucket_id = 'user-documents' and (storage.foldername(name))[1] = auth.uid()::text);
