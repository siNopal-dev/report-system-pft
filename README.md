# Report System — Finishing, Resep FA, Printing

## Halaman aktif
- `/` — scan dan input resep FA (akun all).
- `/recipes/archive` — arsip resep FA (akun all).
- `/printing` — input produksi printing (akun all dan printing).
- `/printing/recap` — rekap produksi printing (akun all dan printing).
- `/finishing` — input produksi finishing (akun all, finishing, atau akun process dengan bagian finishing sesuai tahap).
- `/finishing/recap` — rekap finishing: filter tanggal, bagian, mesin, shift, satuan; total produksi per satuan untuk seluruh hasil filter; edit/hapus; ekspor Excel sesuai filter untuk semua hasil, termasuk yang tidak terlihat pada halaman tabel saat ini.

Halaman dan API modul dashboard PPC lama telah dihapus dari aplikasi. Data lama pada tabel `ppc_module_records` tidak dihapus.

## Form finishing
Bagian dan mesin: Bakar Bulu (Mesin 1, Mesin 2); Stenter (Yamuma, MW1, MW2); Desizing/Washing (Panon, Xilian, Haspel); Calendar (Ramish, Wakayama, Sadhu). Shift 1–3. Satuan Meter, Kodi, Potong. Kendala: Tidak Ada, Kebersihan, Sambung Kain, Kerusakan Mesin, Tunggu Air, Tunggu Sangan, Bikin Obat, Istirahat, Sholat, Lain Lain. Daftar downtime dapat ditambah/dihapus (maksimal 30) dengan durasi menit opsional dan jumlah durasi maksimal 1.440 menit. Keterangan opsional. Tanggal awal mengikuti kalender Asia/Jakarta. Kecepatan mesin berupa angka tanpa satuan karena satuannya belum ditentukan.

Akun dengan access_role `process` bertahap `Bakar Bulu`, `Stenter`, `Desizing / Washing`, atau `Calender` hanya dapat membaca dan mengubah data bagiannya, termasuk pada API dan ekspor. Akun `finishing` dan `all` dapat melihat semua bagian. Akun lain yang belum memiliki akses ke enam halaman akan melihat pesan akses ketika login. Saat mengedit, bagian lama juga harus termasuk akses akun.

## Setup
1. Instal: `npm ci`.
2. Atur `.env.local`: `DATABASE_URL` koneksi PostgreSQL Supabase proyek PPC; `APP_ORIGIN` URL produksi (tanpa slash akhir). Jangan commit `.env.local`.
3. Jika tabel finishing belum ada, jalankan `supabase/finishing_production.sql` di SQL Editor project PPC. Jika tabel sudah ada, **jangan jalankan ulang skrip awal**; jalankan `supabase/finishing_multiple_issues.sql` sebelum menjalankan aplikasi versi ini. Migrasi mempertahankan kendala lama tanpa mengarang durasi menit.
4. Untuk data Printing yang sudah ada, jalankan `supabase/printing_production_units.sql` satu kali. Data lama mendapat satuan Meter. Migrasi ini sudah diterapkan pada database `ppc-system`.
5. Opsional: buat akun finishing khusus dengan `npm run user:create -- --finishing`, password dimasukkan secara interaktif (minimal 5 karakter). Akun lama dengan akses finishing juga bisa dipakai.
6. Jalankan `npm run dev`; verifikasi `npm test` dan `npm run build` sebelum deploy.

Koneksi database melalui server dengan query berparameter. Sesi disimpan pada `ppc_sessions` dan cookie HttpOnly. Tabel finishing menerapkan RLS serta menolak akses anonim. Filter dan hak akses diverifikasi di server. Beberapa kendala dapat disimpan dalam satu input produksi; kolom `issue` lama tetap berisi kendala pertama untuk kompatibilitas.

## Printing
Menu menggunakan nama Input Produksi Printing dan Rekap Produksi Printing. Jumlah produksi memilih Meter atau Kodi, sehingga total rekap dipisah sesuai satuannya. Downtime (menit) opsional; kendala dapat dipilih Tidak Ada. Catatan Printing lama tetap disimpan di tabel `printing_lost_time`, dan kolom `production_meters` lama tetap dipertahankan untuk kompatibilitas sementara.
