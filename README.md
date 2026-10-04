# Arus — Dashboard Keuangan

Dashboard keuangan pribadi berbahasa Indonesia, dibuat dengan **React**, **Vite**, dan **Lucide React**. Frontend saja, tanpa API, database, atau akun bank.

## Jalankan

Prasyarat: Node.js **20.19+ atau 22.12+** yang didukung Vite, serta npm.

```sh
npm install
npm run dev
```

Buka alamat lokal yang ditampilkan Vite (biasanya `http://localhost:5173`).

```sh
npm run build    # Build produksi ke dist/
npm run preview  # Preview build produksi
npm test         # Tes perhitungan, data contoh, dan validasi transaksi
```

## Fitur

- Ringkasan saldo, pemasukan, pengeluaran, dan sisa uang.
- Grafik arus kas interaktif untuk 6 atau 12 bulan.
- Diagram komposisi pengeluaran berdasarkan kategori.
- Tambah, edit, dan hapus transaksi dengan validasi serta konfirmasi hapus.
- Pencarian, filter kategori/dompet/jenis transaksi, periode, dan pagination.
- Tiga dompet: rekening utama, uang tunai, dan dompet digital.
- Halaman laporan dan insight sederhana dari data transaksi.
- Ekspor CSV sesuai periode; pada halaman Transaksi, ekspor mengikuti pencarian dan filter aktif.
- Nama profil bisa disesuaikan.
- Responsif, navigasi mobile, dialog ramah keyboard, dan dukungan reduced motion.

## Tentang data

Aplikasi dibuka dengan **data contoh enam bulan**. Untuk memakai data sendiri, buka **Pengaturan → Kosongkan transaksi**. Saldo awal tetap:

| Dompet | Saldo awal |
| --- | ---: |
| Rekening utama | Rp12.500.000 |
| Uang tunai | Rp1.000.000 |
| Dompet digital | Rp500.000 |

**Total saldo** selalu dihitung dari saldo awal semua dompet dan seluruh transaksi, tidak dibatasi filter periode. Pemasukan, pengeluaran, sisa uang, kategori, serta tabel mengikuti periode terpilih. Grafik menampilkan riwayat hingga bulan terpilih. Perbandingan bulanan membandingkan total bulan terpilih dengan total bulan sebelumnya; bulan yang belum selesai tidak diprorata. Saldo dompet boleh negatif karena tidak ada integrasi atau validasi saldo bank.

Perubahan disimpan di `localStorage` browser yang sama (`arus-transactions-v1` dan `arus-profile-v1`). Tidak ada sinkronisasi lintas perangkat, autentikasi, atau pengiriman data transaksi ke server. Jika penyimpanan browser tidak tersedia atau penuh, aplikasi memberikan peringatan dan perubahan hanya bertahan selama sesi.

**Ekspor CSV secara berkala untuk membuat salinan.** Menghapus data browser akan menghapus data yang tersimpan. CSV adalah ekspor saja; impor belum tersedia. Memuat data contoh akan mengganti transaksi saat ini setelah konfirmasi.

Font DM Sans dan Manrope dimuat dari Google Fonts; jika jaringan tidak tersedia, aplikasi menggunakan font sistem. Tidak ada gambar atau layanan berbayar yang dibutuhkan.

## Struktur

```text
src/
  App.jsx           UI dan alur dashboard
  styles.css        Desain responsif
  finance.js        Data contoh dan helper keuangan
  finance.test.js   Pengujian helper
  main.jsx          Entry point React
```
