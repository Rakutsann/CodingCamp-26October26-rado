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

Tidak perlu instalasi dependensi apa pun.

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

## Ditenbitkan ke GitHub Pages

1. Push repository ke GitHub.
2. Aktifkan GitHub Pages di Settings → Pages.
3. Pilih branch dan folder root.
