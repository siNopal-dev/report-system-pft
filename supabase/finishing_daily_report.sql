-- Jalankan satu kali pada database Report System. Data produksi dan laporan lain tidak diubah.
create table if not exists public.finishing_daily_report (
  report_date date not null,
  section text not null check (section in ('bakar','washing','kalender','stenter')),
  values_json jsonb not null default '{}'::jsonb check (jsonb_typeof(values_json) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (report_date, section)
);
alter table public.finishing_daily_report enable row level security;
revoke all on public.finishing_daily_report from anon, authenticated;
