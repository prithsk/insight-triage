-- Create private storage bucket for knowledge-base documents
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Ensure documents table is protected with RLS
alter table public.documents enable row level security;

-- Documents table policies (authenticated users)
drop policy if exists "Documents are readable" on public.documents;
drop policy if exists "Documents are insertable" on public.documents;
drop policy if exists "Documents are updatable" on public.documents;
drop policy if exists "Documents are deletable" on public.documents;

create policy "Documents are readable"
  on public.documents
  for select
  to authenticated
  using (true);

create policy "Documents are insertable"
  on public.documents
  for insert
  to authenticated
  with check (true);

create policy "Documents are updatable"
  on public.documents
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Documents are deletable"
  on public.documents
  for delete
  to authenticated
  using (true);

-- Storage policies for documents bucket
-- NOTE: policies live on storage.objects (reserved schema) - this is the supported way to secure file access

drop policy if exists "Documents files are readable" on storage.objects;
drop policy if exists "Documents files are insertable" on storage.objects;
drop policy if exists "Documents files are updatable" on storage.objects;
drop policy if exists "Documents files are deletable" on storage.objects;

create policy "Documents files are readable"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'documents');

create policy "Documents files are insertable"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'documents');

create policy "Documents files are updatable"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'documents')
  with check (bucket_id = 'documents');

create policy "Documents files are deletable"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'documents');
