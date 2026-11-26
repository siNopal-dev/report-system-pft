-- Jalankan sekali pada project ppc-system. Tabel modul PPC lama dan datanya tidak dihapus.
begin;
alter table public.ppc_users drop constraint if exists ppc_users_access_role_check;
alter table public.ppc_users add constraint ppc_users_access_role_check check (access_role in ('all','process','printing','finishing'));
alter table public.ppc_users drop constraint if exists ppc_user_stage_consistency;
alter table public.ppc_users add constraint ppc_user_stage_consistency check (
 (access_role in ('all','printing','finishing') and process_stage is null) or
 (access_role='process' and (process_stage is null or process_stage in (
 'Soft Winding','Kelos','Warping','Sizing','Cucuk','Weaving','Inspection',
 'Bakar Bulu','Desizing / Washing','Stenter','Calender',
 'Inspection Akhir','Potong Kain','Potong Sarung')))
);
create table if not exists public.finishing_production (
 id uuid primary key default gen_random_uuid(),
 production_date date not null,
 section text not null check (section in ('Bakar Bulu','Stenter','Desizing/Washing','Calendar')),
 machine text not null,
 shift text not null check (shift in ('Shift 1','Shift 2','Shift 3')),
 production_quantity numeric(14,3) not null check (production_quantity >= 0),
 unit text not null check (unit in ('Meter','Kodi','Potong')),
 machine_speed numeric(14,3) not null check (machine_speed >= 0),
  issue text not null check (issue in ('Tidak Ada','Kebersihan','Sambung Kain','Kerusakan Mesin','Tunggu Air','Tunggu Sangan','Bikin Obat','Istirahat','Sholat','Lain Lain')),
  issues jsonb not null default '[]'::jsonb,
 notes text not null default '' check (length(notes)<=1000),
 created_by uuid references public.ppc_users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint finishing_machine_section_check check (
 (section='Bakar Bulu' and machine in ('Mesin 1','Mesin 2')) or
 (section='Stenter' and machine in ('Yamuma','MW1','MW2')) or
 (section='Desizing/Washing' and machine in ('Panon','Xilian','Haspel')) or
 (section='Calendar' and machine in ('Ramish','Wakayama','Sadhu'))
 )
);
create index if not exists finishing_production_filters_idx on public.finishing_production(production_date desc,section,machine,shift);
alter table public.finishing_production enable row level security;
revoke all on public.finishing_production from public,anon,authenticated;
grant select,insert,update,delete on public.finishing_production to service_role;
commit;
