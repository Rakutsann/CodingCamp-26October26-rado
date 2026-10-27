# Design Document

## Overview

Ruang adalah aplikasi web statis single-page yang dibangun dengan HTML, CSS, dan Vanilla JavaScript. Seluruh state disimpan di Local Storage dengan kunci `ruang:v1`. Aplikasi terdiri dari satu halaman (`index.html`), satu file CSS (`css/style.css`), dan satu file JS (`js/app.js`).

## Architecture

Aplikasi mengikuti pola single source of truth: setiap interaksi pengguna memperbarui objek state di memori, menyimpan ke Local Storage, lalu me-render ulang komponen yang terpengaruh. Ikon antarmuka menggunakan SVG inline; favicon adalah file lokal `assets/favicon.svg` yang ditautkan dari HTML.

## Components and Interfaces

### Komponen Utama

```
+------------------------------------------------------+
|                    index.html                        |
+----------+------------------------------------------+
|          |  Header (breadcrumb, storage, theme)      |
|  Sidebar +------------------------------------------+
|  (224px) |  Pembuka (sapaan + waktu)                 |
|          +------------------------------------------+
|  - Logo  |  Ringkasan Harian                          |
|  - Menu  +-------------------+----------------------+
|  - User  |  Kartu Tugas       |  Kartu Timer (sage)  |
|          |  (kolom kiri 1.4)  |  (kolom kanan 1)     |
|          +-------------------+----------------------+
|          |  Kartu Pintasan    |  Kartu Aktivitas    |
|          |                    |  Mingguan            |
+----------+-------------------+----------------------+
```

### Modul JavaScript (dalam app.js)

```javascript
// 1. State Management
const Store = {
  key: "ruang:v1",
  load() { /* baca dan validasi dari LocalStorage */ },
  save() { /* simpan ke LocalStorage */ },
  reset() { /* reset ke default */ },
  migrate(oldData) { /* migrasi format sebelumnya */ }
};

// 2. Timer Engine
const Timer = {
  start() { /* set endAt = Date.now() + total*1000, running=true, id baru */ },
  pause() { /* remaining = endAt - Date.now(), running=false */ },
  resume() { /* endAt = Date.now() + remaining*1000, running=true */ },
  reset() { /* id baru, running=false, remaining=total, endAt=null */ },
  tick() { /* hitung sisa dari endAt, update tampilan, jangan save LS */ },
  complete() { /* catat sesi jika belum ada, tampilkan notifikasi */ }
};

// 3. Task Manager
const Tasks = {
  add(title, category, priority) {},
  edit(id, updates) {},
  toggle(id) {},
  remove(id) {},
  search(query) {},
  filter(type) {},
  sort(type) {},
  focusCountForTask(taskId) { /* hitung dari sessions */ }
};

// 4. Links Manager (pintasan)
const Links = {
  add(name, url) {},
  edit(id, updates) {},
  remove(id) {},
  validateUrl(url) {}
};

// 5. Stats Engine
const Stats = {
  todaySummary() { /* dari sessions, tanggal lokal */ },
  weeklyChart() { /* 7 hari terakhir dari sessions */ }
};

// 6. Theme Manager
const Theme = {
  set(mode) { /* light/dark/system */ },
  apply() {},
  watchSystem() {}
};

// 7. Settings & Backup
const Backup = {
  export() { /* hitung sisa timer, snapshot jeda, unduh JSON */ },
  import(file) { /* validasi semua, konfirmasi, reset timer */ }
};

// 8. UI Renderer
const UI = {
  renderGreeting() {},
  renderClock() {},
  renderTasks() {},
  renderTimer() {},
  renderStats() {},
  renderLinks() {},
  renderSettings() {}
};

// 9. Focus Mode
const FocusMode = {
  open() {},
  close() {},
  sync() {}
};
```

### Alur Data

```
User Action -> Event Handler -> State Update -> LocalStorage Save -> UI Re-render
```

State adalah single source of truth. Setiap perubahan state:
1. Memperbarui objek state di memori
2. Menyimpan ke Local Storage (kunci `ruang:v1`)
3. Memicu re-render komponen yang terpengaruh

### Timer Logic

Timer menggunakan pendekatan waktu akhir (end-time based) untuk akurasi:

```
Saat Mulai:
  endAt = Date.now() + total * 1000
  id = generateUniqueId()
  running = true
  Simpan ke LS

Saat Jeda:
  remaining = Math.round((endAt - Date.now()) / 1000)
  running = false
  Simpan ke LS

Saat Lanjutkan:
  endAt = Date.now() + remaining * 1000
  running = true  (id tetap sama)
  Simpan ke LS

Saat Reset:
  id = generateUniqueId()  (id baru)
  running = false
  remaining = total
  endAt = null
  Simpan ke LS
  Tidak mencatat sesi lama

Saat Tick (setiap 1 detik):
  sisa = endAt - Date.now()
  Jika sisa <= 0: sesi selesai
  Hanya update tampilan, JANGAN simpan LS

Saat Refresh / kembali dari tab:
  Baca snapshot dari LS
  Jika running: hitung sisa dari endAt
    Jika sudah habis: selesaikan dan catat sekali
  Jika tidak running: gunakan remaining
```

### Pencatatan Sesi (Anti-Duplikasi)

```
Saat sesi fokus selesai:
  1. Cek apakah timer.id sudah ada di sessions
  2. Jika belum ada:
     - endedAt = new Date(endAt).toISOString() (waktu jadwal, bukan sekarang)
     - Tambah ke sessions: { id, endedAt, seconds: total, taskId }
     - Tampilkan notifikasi + pilihan istirahat
  3. Jika sudah ada -> abaikan (anti-duplikasi)

Sesi istirahat selesai:
  - Tidak menambah ke sessions
  - Tampilkan notifikasi selesai

Saat reset:
  - Jangan catat sesi apa pun
  - Buat id baru
```

### Theme Management

```
Tema "light": set data-theme="light" di <html>
Tema "dark": set data-theme="dark" di <html>
Tema "system": ikuti prefers-color-scheme, update saat media query berubah

Variabel CSS didefinisikan di :root dan [data-theme="dark"]
```

### Responsif Strategy

```
>1250px:     Sidebar 224px, ikon + teks. Grid 2 kolom 1,4:1. Padding 42px.
1021-1250px: Sidebar 195px, ikon + teks. Grid 2 kolom. Padding disesuaikan.
641-1020px:  Sidebar 76px, hanya ikon. Grid 2 kolom. Padding disesuaikan.
<=640px:     Sidebar hidden. Pengaturan di header. Grid 1 kolom.
<=390px:     Optimalisasi padding dan ukuran font.
<=320px:     Spacing minimal, tanpa scroll horizontal.
```

Gunakan `minmax(0, ...)` pada grid columns dan `overflow: hidden` / `min-width: 0`
pada kartu untuk mencegah isi kartu memaksa halaman melebar.

### Sound Design

Suara selesai dibuat menggunakan Web Audio API (osilator lembut) untuk
menghindari file eksternal. AudioContext dibuat atau diaktifkan saat
pengguna menekan Mulai (interaksi pengguna) untuk memenuhi kebijakan
autoplay browser:

```javascript
function ensureAudioContext() {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function playCompleteSound() {
  ensureAudioContext();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  // Nada lembut, decay singkat
}
```

### Cross-Tab Sync

Handler storage yang aman:

```javascript
window.addEventListener("storage", (e) => {
  if (e.key !== "ruang:v1") return;
  if (!e.newValue) return;            // null atau kosong -> abaikan
  try {
    const data = JSON.parse(e.newValue);
    if (!validateState(data)) {
      showToast("Data dari tab lain tidak valid");
      return;
    }
    state = data;                     // ganti state
    UI.renderAll();                    // render ulang
    // JANGAN simpan balik ke LS untuk mencegah loop
  } catch (err) {
    showToast("Gagal membaca data dari tab lain");
  }
});
```

## Data Models

### State Model (Kontrak Penyimpanan)

```javascript
state = {
  version: 1,
  settings: {
    name: "Rado",
    focusMinutes: 25,       // 1-120
    breakMinutes: 5,        // 1-60
    goal: 4,                // 2, 4, 6, atau 8
    theme: "light",         // "light" | "dark" | "system"
    sound: true             // suara selesai
  },
  tasks: [
    {
      id: "uuid",
      title: "string (max 160)",
      category: "personal" | "belajar" | "kerja",
      priority: "high" | "normal" | "low",
      done: false,
      createdAt: "ISO string",
      completedAt: null       // ISO string atau null
    }
  ],
  links: [
    {
      id: "uuid",
      name: "GitHub",
      url: "https://github.com"
    }
  ],
  sessions: [
    {
      id: "session-uuid",    // sama dengan timer.id saat sesi
      endedAt: "ISO string",  // waktu jadwal selesai
      seconds: 1500,         // durasi sesi dalam detik
      taskId: ""             // string kosong jika tanpa tugas
    }
  ],
  timer: {
    id: "uuid",
    mode: "focus",           // "focus" | "break"
    total: 1500,             // detik
    remaining: 1500,          // detik (saat jeda/idle)
    running: false,
    endAt: null,             // timestamp milidetik atau null
    taskId: ""               // string kosong jika tanpa tugas
  }
}
```

### Catatan Kontrak

- Tidak ada field `shortcuts`, `history.sessions`, `completed`, atau `focusSessions`
- Jumlah sesi per tugas dihitung dari `sessions` berdasarkan `taskId`
- `createdAt`, `completedAt`, `endedAt` adalah string ISO
- `endAt` adalah timestamp milidetik (number) atau null
- `total`, `remaining`, `seconds` dalam satuan detik
- `taskId` string kosong ("") untuk tidak ada tugas
- `theme` menggunakan "system" (bukan "auto")

### Default Links (Pintasan Awal)

```javascript
[
  { id: "l1", name: "GitHub",   url: "https://github.com" },
  { id: "l2", name: "Gmail",    url: "https://mail.google.com" },
  { id: "l3", name: "YouTube",  url: "https://youtube.com" },
  { id: "l4", name: "Figma",    url: "https://figma.com" }
]
```

### Migrasi Format Sebelumnya

Jika data dengan kunci `ruang:v1` sudah tersimpan dengan struktur lama
(misalnya `settings.focusDuration`, `tasks.completed`, `shortcuts`,
`history.sessions`, `timer.endTime`), tangani migrasi:

```javascript
function migrate(oldData) {
  // Jika version tidak ada atau berbeda, coba migrasi
  // Jika format tidak dikenali, pertahankan data lama dan
  // gunakan default untuk field yang hilang
  // Jangan langsung menimpa data pengguna
}
```

### CSS Architecture

#### Variabel Tema

```css
:root {
  --bg: #f8f7f3;
  --card: #fffefa;
  --sidebar: #f0f0e8;
  --text: #303c34;
  --text-secondary: #687261;
  --border: #e8e9e1;
  --btn-primary: #3f5d4b;
  --btn-primary-hover: #2e4939;
  --sage: #e3e9dd;
  --sage-light: #eef2e9;
  --terracotta: #ba785a;
  --timer-bg: #e2e9db;
  --radius-card: 18px;
  --radius-btn: 8px;
  --gap: 24px;
}

[data-theme="dark"] {
  --bg: #202822;
  --card: #283129;
  --sidebar: #242d26;
  --text: #e1e6d8;
  --text-secondary: #a0aa98;
  --border: #3a4539;
  --btn-primary: #9fb58d;
  --timer-bg: #313f2e;
}
```

#### Breakpoints

```css
/* Sidebar: 224px default (>1250px) */
@media (max-width: 1250px) { /* sidebar 195px, ikon + teks */ }
@media (max-width: 1020px) { /* sidebar 76px, hanya ikon */ }
@media (max-width: 640px)  { /* sidebar hidden, pengaturan di header, 1 kolom */ }
@media (max-width: 390px)  { /* padding ketat */ }
@media (max-width: 320px)  { /* spacing minimal */ }
```

## File Structure

```
/
+-- index.html          # Struktur HTML + SVG inline
+-- css/
|   +-- style.css       # Semua styling (tema, layout, komponen)
+-- js/
|   +-- app.js          # Semua logika aplikasi
+-- assets/
|   +-- favicon.svg     # Favicon lokal
+-- README.md           # Dokumentasi bahasa Indonesia
+-- .kiro/
    +-- steering/
    |   +-- project.md
    +-- specs/
        +-- ruang/
            +-- requirements.md
            +-- design.md
            +-- tasks.md
```

## Design Decisions

1. **Single file JS**: Semua modul dalam satu file untuk kesederhanaan deploy.
2. **Date.now() + endAt timer**: Mencegah drift dan bertahan setelah refresh/tab switch. endedAt menggunakan waktu jadwal, bukan waktu buka halaman.
3. **Session ID anti-duplikasi**: id timer = id sesi. Jeda/Lanjutkan tetap. Reset buat baru.
4. **Tick tanpa save**: Tick hanya menghitung dan update tampilan. Save hanya saat mulai/jeda/lanjut/reset/selesai.
5. **Web Audio API untuk suara**: Tidak butuh file audio eksternal. AudioContext diaktifkan saat interaksi pengguna.
6. **CSS Variables untuk tema**: Beralih tema tanpa reload, dark mode via data-theme attribute.
7. **Inline SVG untuk ikon UI**: Tidak perlu request gambar, full control styling. Favicon tetap file lokal.
8. **Warna ikon tetap (tidak ikut tema)**: Konsistensi branding lintas tema.
9. **Sessions sebagai sumber tunggal statistik**: Jumlah sesi per tugas dihitung dari array sessions, bukan penghitung terpisah.
10. **Validasi dan migrasi eksplisit**: Data format lama dimigrasi, bukan ditimpa.

## Error Handling

- Local Storage penuh/gagal -> tampilkan toast "Penyimpanan browser gagal"
- File impor rusak/terlalu besar -> tampilkan error, jangan hapus data aktif
- URL pintasan invalid -> tampilkan error inline
- Duplikat tugas -> tampilkan peringatan singkat
- Storage event dengan data invalid -> pertahankan state aktif, tampilkan pemberitahuan
- AudioContext diblokir -> timer tetap berjalan, suara dilewati

## Testing Strategy

Pengujian dilakukan manual karena tidak ada framework pengujian:
1. Timer: berjalan, jeda, lanjutkan, bertahan setelah refresh
2. Sesi selesai hanya tercatat sekali; istirahat tidak menambah statistik
3. Pergantian tugas/mode ditolak saat timer berjalan
4. Urutan tugas dan pencegahan duplikat
5. Cadangan: ekspor, impor, file rusak, pembatalan impor
6. Sinkronisasi antar-tab tidak crash
7. Warna ikon sama pada kedua tema
8. Responsif: 320, 390, 768, 1280, 1440px, tanpa scroll horizontal
9. Jam satu baris di HP
10. Semua tombol berfungsi
11. Escape menutup dialog
12. prefers-reduced-motion

## Correctness Properties

1. **Property 1: Timer akurasi** — Timer menggunakan Date.now() dan endAt sebagai sumber waktu tunggal. Sisa waktu selalu = endAt - Date.now() saat running, atau remaining saat paused. Tidak ada drift dari akumulasi interval.
2. **Property 2: Sesi tepat sekali** — Sesi dicatat tepat satu kali per timer.id. Cek keberadaan id di sessions sebelum menambah. Jeda/Lanjutkan tidak membuat id baru.
3. **Property 3: Reset tidak mencatat** — Reset membuat timer.id baru tanpa menambah sesi lama ke sessions.
4. **Property 4: Istirahat tidak menambah statistik** — Hanya sesi mode "focus" yang masuk ke sessions. Sesi "break" tidak menambah menit fokus atau jumlah sesi.
5. **Property 5: endedAt waktu jadwal** — endedAt menggunakan waktu endAt yang dijadwalkan, bukan Date.now() saat halaman dibuka kembali.
6. **Property 6: Duplikat tugas dicegah** — Tugas aktif dengan judul yang sama (case-insensitive, trim) ditolak, termasuk saat mengaktifkan kembali tugas selesai.
7. **Property 7: Urutan aktif-sebelum-selesai** — Pada semua pengurutan, tugas aktif selalu ditampilkan sebelum tugas selesai.
8. **Property 8: URL divalidasi** — Pintasan hanya menerima HTTP/HTTPS via konstruktor URL.
9. **Property 9: Impor aman** — File rusak atau pembatalan tidak mengubah data aktif. Maksimal 3 MB.
10. **Property 10: Storage event aman** — Handler storage tidak crash pada null/invalid, tidak menulis balik untuk mencegah loop.
11. **Property 11: Statistik dari sessions** — Semua statistik dihitung dari array sessions dengan tanggal lokal, bukan penghitung terpisah.
12. **Property 12: Tick tanpa save** — Tick tidak menulis ke Local Storage untuk menghindari penulisan berlebihan.
