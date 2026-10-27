# Implementation Plan: Ruang - To-Do List Life Dashboard

## Overview

Implementasi aplikasi Ruang, To-Do List Life Dashboard dengan HTML, CSS, dan Vanilla JavaScript. Dibagi menjadi 20 tugas yang mencakup struktur HTML, styling CSS, logika JavaScript, dan verifikasi. Kontrak penyimpanan menggunakan kunci `ruang:v1` dengan struktur: version, settings, tasks, links, sessions, timer.

## Tasks

- [ ] 1. Struktur HTML Dasar — Buat index.html dengan sidebar, header, konten utama, 4 kartu grid, dialog pengaturan, mode fokus, notifikasi. Ikon antarmuka menggunakan SVG inline (logo, ikon menu, ikon tugas, ikon YouTube). Favicon lokal `assets/favicon.svg` ditautkan dari HTML. Struktur semantik dengan label ARIA.
- [ ] 2. CSS Variabel Tema dan Reset — Definisikan variabel CSS untuk tema terang (:root) dan gelap ([data-theme="dark"]). Semua warna spesifikasi, radius (kartu 18px, tombol 8px), gap 24px, font (Manrope, DM Sans). Reset dasar dan box-sizing.
- [ ] 3. CSS Layout Desktop — Sidebar fixed 224px (>1250px), header 76px, padding horizontal 42px, grid 2 kolom (1,4:1) dengan minmax(0, ...), 4 kartu. Breadcrumb, indikator penyimpanan, tombol tema, avatar di header. Menu sidebar 5 item, bagian bawah sidebar (pengaturan, avatar, nama, "Ruang milikmu", "Sedikit demi sedikit, tetap berarti.").
- [ ] 4. CSS Komponen Kartu dan Tugas — Style kartu, input cepat, form detail, item tugas (checkbox bulat, tombol fokus hanya untuk tugas belum selesai, tombol edit/hapus), filter, urutan, pencarian, progress bar, empty state dengan tombol saran.
- [ ] 5. CSS Timer dan Mode Fokus — Kartu timer sage, lingkaran progres 208px, tab Fokus/Istirahat, tombol kontrol, pemilih tugas (disabled saat running/break). Mode fokus penuh: logo kiri, keluar kanan, "DUNIA BISA MENUNGGU SEBENTAR", "Cukup satu hal, sekarang.", nama tugas, timer besar, "Tarik napas...".
- [ ] 6. CSS Statistik, Pintasan, dan Pengaturan — Ringkasan harian, grafik batang, kartu pintasan (warna ikon tetap identik terang/gelap), dialog "Jadikan milikmu", toast, cadangan ekspor/impor. Fokus keyboard terlihat, prefers-reduced-motion.
- [ ] 7. CSS Responsif — Breakpoints bertahap: >1250px sidebar 224px ikon+teks; max-width 1250px sidebar 195px ikon+teks; max-width 1020px sidebar 76px hanya ikon; max-width 640px sidebar hidden + pengaturan di header + satu kolom; max-width 390px padding ketat; max-width 320px spacing minimal. Gunakan minmax(0, ...) dan overflow hidden agar tidak ada scroll horizontal. Jam satu baris di HP.
- [ ] 8. JavaScript State Management — Store dengan kunci "ruang:v1". Struktur: version 1, settings (name, focusMinutes, breakMinutes, goal, theme, sound), tasks (id, title, category, priority, done, createdAt, completedAt), links (id, name, url), sessions (id, endedAt, seconds, taskId), timer (id, mode, total, remaining, running, endAt, taskId). Default: Rado, 25 menit, 5 menit, goal 4, light, sound true, tasks kosong, 4 links awal. Migrasi format lama eksplisit, jangan timpa data tidak dikenali. Error handling penyimpanan gagal. Cross-tab sync via storage event dengan validasi try/catch, abaikan kunci lain, tangani null, jangan menulis balik.
- [ ] 9. JavaScript Sapaan dan Waktu — Eyebrow "HARI BARU, RUANG BARU", sapaan per waktu (pagi/siang/sore/malam), nama dari settings, deskripsi. Tanggal lengkap bahasa Indonesia. Jam HH:MM:SS tiap detik. Zona waktu perangkat, Asia/Jakarta = "WAKTU INDONESIA BARAT" (bukan WIB). Pastikan satu baris di HP.
- [ ] 10. JavaScript Manajemen Tugas — CRUD: tambah (input cepat + form detail), edit, toggle done, hapus dengan undo 8 detik. Judul max 160. Kategori personal/belajar/kerja, priority high/normal/low (label Tinggi/Normal/Rendah). Anti-duplikat aktif (case-insensitive, trim) termasuk saat reaktivasi tugas selesai. Filter Semua/Aktif/Selesai. Sort Terbaru/Prioritas/A-Z. Tugas aktif selalu sebelum selesai pada semua pengurutan. Pencarian Ctrl+K/Cmd+K. Progress bar "X dari Y tugas selesai". Empty state + tombol saran "+ Baca 10 halaman" dan "+ Satu hal penting". Tombol Fokus hanya untuk tugas belum selesai. Jumlah sesi per tugas dihitung dari sessions berdasarkan taskId.
- [ ] 11. JavaScript Timer Engine — Date.now()+endAt-based. Mulai: endAt = Date.now() + total*1000, running=true, id baru. Jeda: remaining = round((endAt-Date.now())/1000), running=false, id tetap. Lanjutkan: endAt = Date.now() + remaining*1000, running=true, id tetap. Reset: id baru, running=false, remaining=total, endAt=null, tanpa catat sesi. Tick: hitung sisa dari endAt, update tampilan saja, JANGAN save LS. Save LS hanya saat mulai/jeda/lanjut/reset/selesai. Tab Fokus/Istirahat. Pemilih tugas disabled saat running dan saat mode break. Saat running, ganti tugas/mode harus ditolak dengan pemberitahuan (jangan auto-jeda). Ikon timer di tugas pilih tanpa mulai. Anti-duplikasi: cek id di sessions sebelum catat. endedAt = ISO dari waktu jadwal endAt. Hanya sesi focus yang masuk sessions (break tidak). Tidak auto-selesaikan tugas/mulai sesi berikutnya. Notifikasi selesai + pilihan istirahat. Suara Web Audio API dengan AudioContext diaktifkan saat interaksi pengguna (tekan Mulai), bisa dimatikan. Durasi baru berlaku setelah reset; timer belum dimulai boleh ikut pengaturan baru. Setelah refresh: hitung dari endAt, jika habis selesaikan dan catat sekali.
- [ ] 12. JavaScript Mode Fokus Penuh — Overlay fullscreen: logo kiri atas, tombol keluar kanan atas, "DUNIA BISA MENUNGGU SEBENTAR", "Cukup satu hal, sekarang.", nama tugas, timer sangat besar, kontrol terhubung ke timer dashboard, "Tarik napas. Beri perhatian pada yang sedang kamu kerjakan." Escape untuk keluar.
- [ ] 13. JavaScript Statistik dan Aktivitas — Ringkasan harian: tugas selesai hari ini (dari tasks done dengan completedAt hari ini), menit fokus hari ini (dari sessions hari ini), sesi vs goal. "Ritme minggu ini": total menit, jumlah sesi, grafik batang 7 hari terakhir dari sessions dengan tanggal lokal. Awal nol. Sesi per tugas dari sessions berdasarkan taskId. Update saat tanggal berganti walau halaman terbuka. Sesi yang diproses setelah buka kembali masuk tanggal endedAt-nya.
- [ ] 14. JavaScript Pintasan — CRUD links: tambah, edit, hapus, urungkan hapus. Default GitHub/Gmail/YouTube/Figma dengan id l1-l4. Monogram G, G, F + SVG YouTube inline. Warna ikon tetap (tidak ikut tema): GitHub teks #3d433e latar #fffefa, Gmail teks #b17b53 latar #f7eee3, YouTube ikon #b76557 latar #faede8 play #fffefa, Figma teks #88739b latar #f1edf5, lain teks #3f5d4b latar #fffefa, border #e8e9e1. Kartu sekeliling ikut tema. Validasi URL: konstruktor URL, HTTP/HTTPS, dukung tanpa protokol, tab baru noopener noreferrer.
- [ ] 15. JavaScript Pengaturan dan Cadangan — Dialog "Jadikan milikmu": nama, focusMinutes 1-120, breakMinutes 1-60, goal 2/4/6/8, theme light/dark/system, sound. Ekspor: hitung sisa timer saat ekspor, simpan snapshot dalam keadaan jeda (running=false, remaining=sisa) tanpa menghentikan timer aktif di halaman, unduh JSON (version, settings, tasks, links, sessions, timer snapshot). Impor: validasi seluruh data sebelum ganti state, batasi file maksimal 3 MB, tampilkan jumlah tugas/links/sessions dalam konfirmasi, pembatalan/kegagalan tidak ubah data aktif, setelah konfirmasi pulihkan data dan reset timer ke mode focus berhenti. Escape tutup dialog.
- [ ] 16. JavaScript Theme Manager — Set tema (light/dark/system), apply data-theme di html, watch prefers-color-scheme untuk system. Tombol tema di header. Persistensi pilihan tema di settings.theme.
- [ ] 17. JavaScript Navigasi dan Keyboard — Menu sidebar smooth scroll ke section. Jumlah tugas aktif di menu. Ctrl+K/Cmd+K fokus pencarian. Escape tutup dialog/mode fokus. Fokus keyboard terlihat. prefers-reduced-motion.
- [ ] 18. Favicon dan Aset — Buat assets/favicon.svg (logo atau 4 kotak 2x2). Tautkan dari index.html.
- [ ] 19. README dan Dokumentasi — README.md bahasa Indonesia: deskripsi, cara jalankan, fitur, struktur file, teknologi. .kiro/steering/project.md ringkasan proyek.
- [ ] 20. Pengujian dan Verifikasi Manual — Periksa: (1) timer berjalan, jeda, lanjut, bertahan setelah refresh; (2) sesi selesai hanya tercatat sekali, istirahat tidak tambah statistik; (3) ganti tugas/mode ditolak saat running; (4) urutan tugas dan anti-duplikat; (5) cadangan pulih, file rusak dan batal impor tidak ganti data; (6) sinkronisasi antar-tab tidak crash; (7) warna ikon sama kedua tema; (8) jam HH:MM:SS dan layout muat di 320/390/768/1280/1440px. Laporkan yang benar-benar diperiksa dan yang belum bisa diverifikasi.

## Task Dependency Graph

```json
{
  "waves": [
    ["1", "18"],
    ["2", "8"],
    ["3"],
    ["4", "5", "6"],
    ["7", "9", "10", "11", "13", "14", "15", "16", "17"],
    ["12"],
    ["19"],
    ["20"]
  ],
  "tasks": [
    { "id": "1", "label": "Struktur HTML Dasar", "dependsOn": [] },
    { "id": "2", "label": "CSS Variabel Tema dan Reset", "dependsOn": ["1"] },
    { "id": "3", "label": "CSS Layout Desktop", "dependsOn": ["2"] },
    { "id": "4", "label": "CSS Komponen Kartu dan Tugas", "dependsOn": ["3"] },
    { "id": "5", "label": "CSS Timer dan Mode Fokus", "dependsOn": ["3"] },
    { "id": "6", "label": "CSS Statistik, Pintasan, dan Pengaturan", "dependsOn": ["3"] },
    { "id": "7", "label": "CSS Responsif", "dependsOn": ["3", "4", "5", "6"] },
    { "id": "8", "label": "JavaScript State Management", "dependsOn": ["1"] },
    { "id": "9", "label": "JavaScript Sapaan dan Waktu", "dependsOn": ["8"] },
    { "id": "10", "label": "JavaScript Manajemen Tugas", "dependsOn": ["8"] },
    { "id": "11", "label": "JavaScript Timer Engine", "dependsOn": ["8"] },
    { "id": "12", "label": "JavaScript Mode Fokus Penuh", "dependsOn": ["11"] },
    { "id": "13", "label": "JavaScript Statistik dan Aktivitas", "dependsOn": ["8"] },
    { "id": "14", "label": "JavaScript Pintasan", "dependsOn": ["8"] },
    { "id": "15", "label": "JavaScript Pengaturan dan Cadangan", "dependsOn": ["8"] },
    { "id": "16", "label": "JavaScript Theme Manager", "dependsOn": ["8"] },
    { "id": "17", "label": "JavaScript Navigasi dan Keyboard", "dependsOn": ["8"] },
    { "id": "18", "label": "Favicon dan Aset", "dependsOn": [] },
    { "id": "19", "label": "README dan Dokumentasi", "dependsOn": ["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18"] },
    { "id": "20", "label": "Pengujian dan Verifikasi Manual", "dependsOn": ["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19"] }
  ]
}
```

## Notes

- Semua tugas CSS (2-7) bergantung pada struktur HTML (Task 1).
- Semua tugas JavaScript (8-17) bergantung pada Task 8 (State Management).
- Task 11 (Timer) harus selesai sebelum Task 12 (Mode Fokus).
- Task 19 (README) dan Task 20 (Verifikasi) dilakukan setelah semua tugas lain selesai.
- Task 18 (Favicon) independen dan dapat dikerjakan kapan saja.
- Kontrak penyimpanan: version 1, settings (name, focusMinutes, breakMinutes, goal, theme, sound), tasks (id, title, category, priority, done, createdAt, completedAt), links (id, name, url), sessions (id, endedAt, seconds, taskId), timer (id, mode, total, remaining, running, endAt, taskId).
- Breakpoint layout: >1250px sidebar 224px; 1021-1250px sidebar 195px; 641-1020px sidebar 76px; <=640px sidebar hidden.
