-- Run once in the SAME Supabase project as ppc_documents.
-- Existing recipe and login tables are untouched.
begin;
create table if not exists public.ppc_module_records (
 id uuid primary key default gen_random_uuid(),
 module text not null check (module in ('orders','schedules','processes','materials','rts','masters')),
 data jsonb not null check (jsonb_typeof(data) = 'object'),
 created_by uuid references public.ppc_users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists ppc_module_records_module_created_idx on public.ppc_module_records(module,created_at desc);
create unique index if not exists ppc_module_order_number_idx on public.ppc_module_records(lower(data->>'number')) where module='orders';
create unique index if not exists ppc_module_master_code_idx on public.ppc_module_records(lower(data->>'code')) where module='masters';
create unique index if not exists ppc_module_material_name_unit_idx on public.ppc_module_records(lower(data->>'name'),(data->>'unit')) where module='materials';
alter table public.ppc_module_records enable row level security;
revoke all on public.ppc_module_records from public,anon,authenticated;
grant select,insert,update,delete on public.ppc_module_records to service_role;
commit;
