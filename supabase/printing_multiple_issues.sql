-- Jalankan hanya pada database lain yang belum menerima perubahan ini.
alter table public.printing_lost_time add column if not exists issues jsonb;
update public.printing_lost_time
set issues=jsonb_build_array(jsonb_build_object('issue',issue,'lost_minutes',lost_minutes))
where issues is null;
alter table public.printing_lost_time alter column issues set not null;
alter table public.printing_lost_time
add constraint printing_issues_shape check (jsonb_typeof(issues)='array' and jsonb_array_length(issues) between 1 and 30);
