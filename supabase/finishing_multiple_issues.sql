-- Jalankan pada database finishing yang sudah ada sebelum memakai versi aplikasi ini.
begin;
alter table public.finishing_production add column if not exists issues jsonb not null default '[]'::jsonb;
update public.finishing_production
set issues = jsonb_build_array(jsonb_build_object('issue', issue, 'lost_minutes', null))
where issues = '[]'::jsonb;
commit;
