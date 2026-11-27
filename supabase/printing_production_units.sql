-- Jalankan sekali pada database PPC yang sudah berisi tabel printing_lost_time.
-- Data lama tetap dipertahankan dan diberi satuan Meter.
begin;
alter table public.printing_lost_time add column if not exists production_quantity numeric;
alter table public.printing_lost_time add column if not exists unit text not null default 'Meter';
update public.printing_lost_time set production_quantity=production_meters where production_quantity is null;
alter table public.printing_lost_time alter column production_meters drop not null;
alter table public.printing_lost_time add constraint printing_production_quantity_check check (production_quantity >= 0);
alter table public.printing_lost_time add constraint printing_unit_check check (unit in ('Meter','Kodi'));
alter table public.printing_lost_time drop constraint if exists printing_lost_time_issue_check;
alter table public.printing_lost_time add constraint printing_lost_time_issue_check check (issue in (
 'Tidak Ada','Ganti Motif/Warna','Cuci Plangkan','Persiapan Produksi','Pasta Saring',
 'Mesin Trouble','Uap Down','Screen Sobek/Bocor','Tunggu Pasta','Tunggu Kain',
 'Kain Trouble','Air Mati','Listrik Padam','perbaikan Screen','Perbaikan Rakhel','Lain-lain'));
commit;
