# Ruang — To-Do List Life Dashboard

**"Satu hal dalam satu waktu."**

Ruang adalah aplikasi web To-Do List Life Dashboard yang membantu kamu fokus pada satu hal dalam satu waktu. Dibangun dengan HTML, CSS, dan Vanilla JavaScript murni — tanpa framework, backend, atau proses build.

## Cara Menjalankan

1. Buka `index.html` di browser modern (Chrome, Firefox, Edge, Safari).
2. Atau jalankan server statis lokal:
   ```
   python3 -m http.server 8000
   ```
   Lalu buka `http://localhost:8000`.

Tidak perlu instalasi dependensi apa pun. Server lokal disarankan agar penyimpanan browser dan sinkronisasi antar-tab konsisten. Gunakan alamat dan port yang sama untuk mengakses data yang sama.

## Halaman dan Navigasi

- **Ringkasan** menyatukan tugas, timer, grafik 7 hari, dan pintasan dalam dua kolom yang tersusun mandiri.
- **Daftar tugas** menyediakan tempat khusus untuk tambah, edit, urutkan, cari, dan selesaikan tugas. Ikon fokus membuka timer untuk tugas yang dipilih.
- **Aktivitas** menampilkan grafik menit fokus dan riwayat sesi lengkap dengan tugas, waktu selesai, serta durasinya.
- **Pintasan** menampilkan situs tersimpan beserta alamat dan kontrol edit/hapus. Tautan memakai elemen link yang dapat digunakan lewat keyboard dan meminta browser membuka tab baru.
- **Ruang fokus** membuka timer penuh. Sesi yang sedang berjalan atau dijeda juga dapat dibuka lewat tombol timer ringkas di header.

Menu di HP tersedia di bawah header. Tombol Kembali browser mengikuti pergantian halaman. Identitas profil ditampilkan sekali di sidebar; pengaturan di HP tersedia di header.

## Fitur

- **Manajemen Tugas**: Tambah, edit, hapus tugas dengan kategori (Personal, Belajar, Kerja) dan prioritas (Tinggi, Normal, Rendah). Filter, urutan, pencarian (Ctrl+K), anti-duplikat, dan undo hapus.
- **Timer Fokus**: Timer Pomodoro-style dengan tab Fokus dan Istirahat. Hitungan bertahan setelah refresh menggunakan `Date.now()`. Lingkaran progres, mode fokus penuh, dan suara selesai.
- **Statistik**: Ringkasan harian (tugas selesai, menit fokus, sesi vs target) dan grafik batang aktivitas 7 hari terakhir.
- **Pintasan**: Akses cepat ke GitHub, Gmail, YouTube, Figma. Tambah, edit, hapus, dan urungkan.
- **Pengaturan**: Nama, durasi fokus/istirahat, target sesi, tema (Terang/Gelap/Ikuti perangkat), suara.
- **Cadangan**: Ekspor dan impor data dalam format JSON. Validasi dan konfirmasi sebelum mengganti.
- **Tema**: Terang dan Gelap dengan palet krem, sage, dan terakota. Warna ikon pintasan tetap identik di kedua tema.

## Struktur File

```
ruang/
├── index.html          # Halaman utama
├── css/
│   └── style.css       # Semua styling
├── js/
│   └── app.js          # Semua logika
├── assets/
│   └── favicon.svg     # Favicon
└── README.md           # Dokumentasi ini
```

## Teknologi

- HTML5
- CSS3 (CSS Variables, Grid, Flexbox)
- Vanilla JavaScript (ES5/ES6)
- Local Storage API (`ruang:v1`)
- Web Audio API (suara selesai)
- Google Fonts (Manrope, DM Sans)

## Penyimpanan Data

Seluruh data disimpan di Local Storage browser dengan kunci `ruang:v1`:
- `settings`: nama, durasi fokus/istirahat, target, tema, suara
- `tasks`: daftar tugas dengan kategori, prioritas, status
- `links`: pintasan favorit
- `sessions`: riwayat sesi fokus yang selesai
- `timer`: snapshot timer saat ini

## Perilaku Timer dan Pemulihan

- Sisa waktu dan sesi yang sedang dijeda bertahan setelah refresh. Perubahan durasi tidak memotong sesi yang sudah dimulai; tekan Reset untuk memakai durasi baru.
- Setiap sesi fokus selesai memiliki ID sendiri. Istirahat dan Reset tidak menambah jumlah sesi fokus.
- Ekspor membuat salinan timer dalam keadaan jeda tanpa menghentikan timer di halaman. Impor yang dikonfirmasi memulihkan data dan menyiapkan timer fokus dalam keadaan berhenti.
- File cadangan diperiksa seluruhnya sebelum konfirmasi. File rusak, format tidak dikenal, atau penyimpanan yang gagal tidak mengganti data aktif.
- Jika data browser tidak dapat dibaca, aplikasi menampilkan peringatan dan menahan penulisan agar data lama tidak tertimpa. Pulihkan melalui cadangan yang valid setelah memeriksa peringatan.

## Keputusan Tampilan

Judul halaman menjelaskan fungsinya, judul kartu menjadi penanda isi, dan keterangan memakai ukuran lebih kecil. Teks tugas, label kecil, serta batas checkbox diperjelas agar lebih mudah dibaca.

Kartu ringkasan memakai dua kolom yang tersusun mandiri. Pintasan di ringkasan dibuat ringkas; halaman Pintasan menampilkan alamat dan tombol Edit/Hapus secara lengkap. Jarak kartu, garis tepi, dan posisi awal isi dibuat konsisten. Warna tema gelap mencakup keadaan aktif dan hover, sementara warna ikon aplikasi tetap dipertahankan.

## Hasil Pemeriksaan

Lihat [VERIFIKASI.md](VERIFIKASI.md) untuk skenario yang diuji, hasil, dan batas pengujian.

## Diterbitkan ke GitHub Pages

1. Push repository ke GitHub.
2. Aktifkan GitHub Pages di Settings → Pages.
3. Pilih branch dan folder root.
