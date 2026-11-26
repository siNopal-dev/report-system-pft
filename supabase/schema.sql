begin;
create table public.ppc_documents (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id),
 template_key text not null check(template_key='fa-palekat-v1'),
 recipe_number text not null check(length(trim(recipe_number))>0),
 data jsonb not null check(jsonb_typeof(data)='object'),
 source_name text,
 created_at timestamptz not null default now(),
 unique(owner_id,template_key,recipe_number)
);
alter table public.ppc_documents enable row level security;
create policy "Read own recipes" on public.ppc_documents for select to authenticated using(owner_id=(select auth.uid()));
create policy "Insert own recipes" on public.ppc_documents for insert to authenticated with check(owner_id=(select auth.uid()));
revoke all on public.ppc_documents from anon, authenticated;
grant select,insert on public.ppc_documents to authenticated;
create index ppc_documents_owner_created_idx on public.ppc_documents(owner_id,created_at desc);
commit;
-- Intentionally no anonymous access, no service role key in the application.
-- A new template must be registered in the app and added to template_key's constraint.
