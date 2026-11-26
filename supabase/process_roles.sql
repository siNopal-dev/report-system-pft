-- Apply after setup_username.sql and dashboard_modules.sql.
-- Unknown accounts are restricted until an administrator assigns a valid process stage.
begin;
alter table public.ppc_users add column if not exists access_role text;
alter table public.ppc_users add column if not exists process_stage text;
alter table public.ppc_users alter column access_role set default 'process';
update public.ppc_users u set
 access_role=case when u.username in ('admin','staff.ppc','supervisor') then 'all' else 'process' end,
 process_stage=case u.username
 when 'soft.winding' then 'Soft Winding'
 when 'kelos' then 'Kelos'
 when 'warping' then 'Warping'
 when 'sizing' then 'Sizing'
 when 'cucuk' then 'Cucuk'
 when 'weaving' then 'Weaving'
 when 'inspection' then 'Inspection'
 when 'bakar.bulu' then 'Bakar Bulu'
 when 'desizing.washing' then 'Desizing / Washing'
 when 'stenter' then 'Stenter'
 when 'calender' then 'Calender'
 when 'inspection.akhir' then 'Inspection Akhir'
 when 'potong.kain' then 'Potong Kain'
 when 'potong.sarung' then 'Potong Sarung'
 else null end;
alter table public.ppc_users drop constraint if exists ppc_user_stage_consistency;
alter table public.ppc_users add constraint ppc_user_stage_consistency check (
 (access_role='all' and process_stage is null) or
 (access_role='process' and (process_stage is null or process_stage in (
 'Soft Winding','Kelos','Warping','Sizing','Cucuk','Weaving','Inspection',
 'Bakar Bulu','Desizing / Washing','Stenter','Calender',
 'Inspection Akhir','Potong Kain','Potong Sarung'))));
commit;
