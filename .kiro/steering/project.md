# Project: Ruang

## Ringkasan

Ruang adalah aplikasi web To-Do List Life Dashboard dengan tagline "Satu hal dalam satu waktu." Dibangun dengan HTML, CSS, dan Vanilla JavaScript murni tanpa framework, backend, atau proses build. Data disimpan di Local Storage browser.

## Teknologi

- HTML5, CSS3, Vanilla JavaScript
- Local Storage API (kunci: `ruang:v1`)
- Web Audio API (suara selesai)
- Google Fonts: Manrope (judul/timer), DM Sans (isi)
- Tanpa dependensi, tanpa build, tanpa framework pengujian

## Struktur File

```
index.html          # Halaman utama
css/style.css       # Satu file CSS
js/app.js           # Satu file JavaScript
assets/favicon.svg  # Favicon lokal
README.md           # Dokumentasi
.kiro/specs/ruang/  # Spesifikasi (requirements, design, tasks)
```

## Kontrak Penyimpanan (ruang:v1)

```json
{
  "version": 1,
  "settings": { "name", "focusMinutes", "breakMinutes", "goal", "theme", "sound" },
  "tasks": [{ "id", "title", "category", "priority", "done", "createdAt", "completedAt" }],
  "links": [{ "id", "name", "url" }],
  "sessions": [{ "id", "endedAt", "seconds", "taskId" }],
  "timer": { "id", "mode", "total", "remaining", "running", "endAt", "taskId" }
}
```

## Catatan Implementasi

- Timer menggunakan `Date.now()` dan `endAt` untuk akurasi dan bertahan setelah refresh
- Sesi dicatat tepat sekali per ID (anti-duplikasi)
- Statistik dihitung dari array `sessions` (sumber tunggal)
- Warna ikon pintasan tetap identik di tema terang dan gelap
- Breakpoint layout: >1250px sidebar 224px, 1021-1250px sidebar 195px, 641-1020px sidebar 76px, ≤640px sidebar hidden
