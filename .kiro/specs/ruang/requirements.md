# Requirements Document

## Introduction

Ruang adalah aplikasi web To-Do List Life Dashboard dengan tagline "Satu hal dalam satu waktu." Aplikasi ini membantu pengguna fokus pada satu hal dalam satu waktu melalui manajemen tugas, timer fokus (Pomodoro-style), statistik aktivitas, dan pintasan. Seluruh data disimpan di sisi klien menggunakan Local Storage. Aplikasi dibangun dengan HTML, CSS, dan Vanilla JavaScript murni tanpa framework, backend, atau proses build.

## Glossary

- **Sesi fokus**: Periode waktu dengan durasi yang ditentukan pengguna (default 25 menit) yang dijalankan melalui timer. Sesi selesai ketika waktu habis tanpa di-reset.
- **Sesi istirahat**: Periode istirahat dengan durasi default 5 menit, tersedia setelah sesi fokus selesai.
- **Snapshot timer**: Keadaan timer yang disimpan ke Local Storage, termasuk mode (fokus/istirahat), status (berjalan/jeda), waktu akhir, dan durasi. Memungkinkan timer bertahan setelah refresh.
- **Ruang fokus**: Mode layar penuh yang mengisolasi pengguna dari distaksi, menampilkan timer besar dan tugas aktif.
- **ID sesi**: Pengenal unik untuk setiap sesi fokus yang mencegah pencatatan ganda statistik.
- **Monogram**: Huruf tunggal yang mewakili pintasan aplikasi (G untuk GitHub, G untuk Gmail, F untuk Figma).
- **Pintasan**: Tautan ke aplikasi eksternal yang ditampilkan sebagai kartu dengan ikon monogram atau SVG.
- **Ringkasan harian**: Baris statistik yang menampilkan tugas selesai, menit fokus, dan progres sesi untuk hari ini.
- **Ritme mingguan**: Grafik batang aktivitas 7 hari terakhir berdasarkan sesi fokus nyata.
- **Target sesi**: Jumlah sesi fokus harian yang dituju pengguna (default 4, opsi 2/4/6/8).
- **Ekspor/Impor**: Fitur cadangan yang mengunduh atau memulihkan seluruh data pengguna dalam format JSON.

## Requirements

### Requirement 1: Manajemen Tugas

**User Story:** Sebagai pengguna, saya ingin mengelola daftar tugas harian saya dengan kategori dan prioritas, sehingga saya bisa fokus pada hal yang penting.

#### Acceptance Criteria

1. THE system SHALL menampilkan kartu "Rencana hari ini" dengan jumlah total tugas pada judul.
2. THE system SHALL menyediakan input cepat dengan placeholder "Apa yang ingin kamu selesaikan?" yang menambah tugas saat tombol Enter ditekan.
3. THE system SHALL menyediakan form detail untuk menambah dan mengedit tugas dengan judul, kategori, dan prioritas.
4. THE system SHALL membatasi judul tugas maksimal 160 karakter.
5. THE system SHALL menyediakan tiga kategori: Personal, Belajar, dan Kerja.
6. THE system SHALL menyediakan tiga tingkat prioritas: Tinggi, Normal, dan Rendah.
7. THE system SHALL menampilkan checkbox bulat untuk menandai tugas sebagai selesai.
8. THE system SHALL menampilkan tombol fokus, edit, dan hapus pada setiap tugas.
9. THE system SHALL menyediakan filter Semua, Aktif, dan Selesai.
10. THE system SHALL menyediakan urutan Terbaru, Prioritas, dan A-Z.
11. WHEN filter aktif, THE system SHALL menampilkan tugas aktif sebelum tugas selesai dalam daftar.
12. THE system SHALL menyediakan pencarian berdasarkan judul atau kategori dengan pintasan keyboard Ctrl+K atau Cmd+K.
13. THE system SHALL mencegah duplikat tugas aktif dengan mengabaikan perbedaan kapitalisasi dan kelebihan spasi.
14. WHEN tugas dihapus, THE system SHALL menampilkan pemberitahuan "Urungkan" yang aktif sekitar delapan detik.
15. THE system SHALL menampilkan jumlah sesi fokus pada tugas yang pernah difokuskan.
16. THE system SHALL menampilkan progress bar dan teks "X dari Y tugas selesai".
17. WHEN daftar tugas kosong, THE system SHALL menampilkan empty state dengan judul "Hari ini masih terbuka." dan deskripsi "Nggak harus banyak. Pilih satu hal kecil yang ingin kamu selesaikan hari ini."
18. THE system SHALL menampilkan tombol saran "+ Baca 10 halaman" dan "+ Satu hal penting" pada empty state yang menambahkan tugas tersebut saat diklik.

### Requirement 2: Timer dan Ruang Fokus

**User Story:** Sebagai pengguna, saya ingin menggunakan timer fokus untuk berkonsentrasi pada satu tugas dalam satu waktu, sehingga saya bisa bekerja lebih efektif.

#### Acceptance Criteria

1. THE system SHALL menampilkan kartu timer dengan judul "Waktunya fokus".
2. THE system SHALL menggunakan durasi fokus awal 25 menit dan durasi istirahat awal 5 menit.
3. THE system SHALL menyediakan tab Fokus dan Istirahat untuk beralih jenis sesi.
4. THE system SHALL menampilkan timer besar dengan lingkaran progres tipis berdiameter sekitar 208px di desktop.
5. THE system SHALL menampilkan tombol Mulai fokus, Jeda, Lanjutkan, dan Reset sesuai keadaan timer.
6. THE system SHALL menyediakan pilihan tugas aktif atau "Fokus tanpa tugas tertentu".
7. WHEN ikon timer pada tugas diklik, THE system SHALL memilih tugas tersebut untuk timer tanpa langsung memulai.
8. THE system SHALL menjeda timer sebelum mengganti tugas atau jenis sesi yang sedang berjalan.
9. THE system SHALL menghitung sisa waktu berdasarkan waktu akhir menggunakan Date.now(), bukan mengurangi angka setiap interval.
10. THE system SHALL mempertahankan hitungan timer yang benar setelah refresh halaman dan perpindahan tab.
11. THE system SHALL mencatat sesi fokus yang selesai tepat satu kali menggunakan ID sesi unik.
12. WHEN timer di-reset atau sesi belum selesai, THE system SHALL tidak menambah statistik.
13. THE system SHALL tidak otomatis menyelesaikan tugas atau memulai sesi berikutnya.
14. WHEN sesi fokus selesai, THE system SHALL menampilkan pemberitahuan dengan pilihan untuk memulai istirahat.
15. THE system SHALL menyediakan suara selesai yang lembut yang dapat dimatikan.
16. WHEN tombol perbesar diklik, THE system SHALL membuka mode fokus penuh yang memenuhi viewport dengan logo kecil, tombol keluar, teks "DUNIA BISA MENUNGGU SEBENTAR", judul "Cukup satu hal, sekarang.", nama tugas, angka timer sangat besar, kontrol terhubung ke dashboard, dan pesan "Tarik napas. Beri perhatian pada yang sedang kamu kerjakan."

### Requirement 3: Sapaan dan Waktu

**User Story:** Sebagai pengguna, saya ingin melihat sapaan personal dan waktu saat ini, sehingga saya merasa aplikasi ini personal dan tenang.

#### Acceptance Criteria

1. THE system SHALL menampilkan eyebrow "HARI BARU, RUANG BARU".
2. THE system SHALL menampilkan sapaan berdasarkan waktu: "Selamat pagi" (05.00-10.59), "Selamat siang" (11.00-14.59), "Selamat sore" (15.00-17.59), "Selamat malam" (selebihnya) diikuti nama pengguna.
3. THE system SHALL menampilkan deskripsi "Kasih ruang untuk hal yang berarti. Mulai dari satu hal kecil."
4. THE system SHALL menampilkan tanggal lengkap dalam bahasa Indonesia.
5. THE system SHALL menampilkan jam lokal dengan format HH:MM:SS yang diperbarui setiap detik.
6. THE system SHALL menampilkan zona waktu perangkat. Untuk Asia/Jakarta, menampilkan "WAKTU INDONESIA BARAT".
7. THE system SHALL memastikan jam sampai detik tetap satu baris dan muat di layar ponsel.
8. THE system SHALL menggunakan nama awal "Rado" yang dapat diubah oleh pengguna.

### Requirement 4: Statistik dan Aktivitas

**User Story:** Sebagai pengguna, saya ingin melihat statistik aktivitas saya, sehingga saya bisa melacak progres dan menjaga konsistensi.

#### Acceptance Criteria

1. THE system SHALL menampilkan ringkasan harian dengan tugas selesai hari ini, menit fokus hari ini, dan sesi fokus dibandingkan target awal empat sesi.
2. THE system SHALL menampilkan kartu "Ritme minggu ini" dengan total menit, jumlah sesi, dan grafik batang tujuh hari terakhir.
3. THE system SHALL menggunakan aktivitas nyata dan tanggal lokal untuk statistik mingguan.
4. THE system SHALL menampilkan statistik awal nol saat belum ada aktivitas.
5. THE system SHALL menggunakan tanggal lokal untuk menentukan hari dalam grafik mingguan.

### Requirement 5: Pintasan Favorit

**User Story:** Sebagai pengguna, saya ingin menyimpan pintasan ke aplikasi yang sering saya gunakan, sehingga saya bisa mengaksesnya dengan cepat dari satu tempat.

#### Acceptance Criteria

1. THE system SHALL menampilkan kartu "Pintasan favorit" dengan GitHub, Gmail, YouTube, dan Figma sebagai pintasan awal.
2. THE system SHALL memungkinkan pengguna menambah, mengedit, menghapus, dan mengurungkan penghapusan pintasan.
3. THE system SHALL menggunakan monogram G, G, F dan ikon SVG YouTube untuk pintasan default. Tidak mengambil favicon dari layanan eksternal.
4. THE system SHALL menggunakan warna ikon yang identik pada tema terang dan gelap: GitHub (teks #3d433e, latar #fffefa), Gmail (teks #b17b53, latar #f7eee3), YouTube (ikon #b76557, latar #faede8, segitiga play #fffefa), Figma (teks #88739b, latar #f1edf5), pintasan lain (teks #3f5d4b, latar #fffefa), border kotak ikon #e8e9e1.
5. THE system SHALL membuat kartu di sekeliling ikon tetap mengikuti tema aplikasi.
6. THE system SHALL memvalidasi URL menggunakan konstruktor URL, hanya mengizinkan HTTP dan HTTPS, mendukung alamat tanpa awalan protokol, dan membuka tab baru dengan noopener noreferrer.

### Requirement 6: Pengaturan dan Cadangan

**User Story:** Sebagai pengguna, saya ingin mengatur preferensi dan mencadangkan data saya, sehingga aplikasi terasa milik saya dan data saya aman.

#### Acceptance Criteria

1. THE system SHALL menyediakan dialog "Jadikan milikmu" dengan: nama panggilan, durasi fokus (1-120 menit), durasi istirahat (1-60 menit), target sesi (2, 4, 6, atau 8), tema (Terang, Gelap, Ikuti perangkat), pilihan suara selesai, dan bagian "Cadangan ruangmu" dengan Ekspor dan Impor.
2. WHEN Ekspor diklik, THE system SHALL mengunduh file JSON berisi pengaturan, tugas, pintasan, riwayat, dan snapshot timer dalam keadaan jeda.
3. WHEN Impor dipilih, THE system SHALL memvalidasi struktur dan isi file, menampilkan konfirmasi sebelum mengganti data, lalu mereset timer.
4. WHEN file impor rusak, THE system SHALL tidak menghapus data yang sedang digunakan.
5. WHEN penyimpanan browser gagal, THE system SHALL menampilkan pemberitahuan.
6. THE system SHALL menyinkronkan perubahan antar-tab pada alamat yang sama melalui event storage.

### Requirement 7: Layout dan Navigasi

**User Story:** Sebagai pengguna, saya ingin layout yang rapi dan navigasi yang jelas, sehingga saya bisa berinteraksi dengan aplikasi dengan nyaman di berbagai ukuran layar.

#### Acceptance Criteria

1. THE system SHALL menampilkan sidebar tetap selebar 224px, header atas setinggi 76px, dan konten utama dengan padding horizontal 42px di desktop.
2. THE system SHALL menampilkan bagian pembuka dengan sapaan di kiri serta tanggal, jam, dan zona waktu di kanan.
3. THE system SHALL menampilkan satu baris ringkasan harian di bawah pembuka.
4. THE system SHALL menampilkan grid utama dengan dua kolom perbandingan sekitar 1,4:1 (kiri atas tugas, kanan atas timer sage, kiri bawah pintasan, kanan bawah aktivitas mingguan).
5. THE system SHALL menampilkan menu sidebar: Ringkasan, Tugas hari ini (dengan jumlah tugas aktif), Ruang fokus, Aktivitas, Pintasan.
6. THE system SHALL menampilkan bagian bawah sidebar dengan Pengaturan, avatar inisial, nama pengguna, tulisan "Ruang milikmu", dan pesan "Sedikit demi sedikit, tetap berarti."
7. THE system SHALL menampilkan header dengan breadcrumb "Ruang personal / Ringkasan", indikator penyimpanan, tombol tema, dan avatar.
8. WHEN layar menengah, THE system SHALL memperkecil sidebar menjadi navigasi ikon.
9. WHEN lebar layar 640px ke bawah, THE system SHALL menyembunyikan sidebar, menampilkan pengaturan di header, dan menyusun kartu menjadi satu kolom.
10. THE system SHALL tampil rapi pada lebar 320, 390, 768, 1280, dan 1440px tanpa scroll horizontal.

### Requirement 8: Identitas Visual

**User Story:** Sebagai pengguna, saya ingin aplikasi terlihat hangat, tenang, dan rapi, sehingga saya merasa nyaman menggunakannya.

#### Acceptance Criteria

1. THE system SHALL menggunakan tema terang dengan warna: background #f8f7f3, kartu #fffefa, sidebar #f0f0e8, teks utama #303c34, teks sekunder #687261, border #e8e9e1, tombol utama #3f5d4b (hover #2e4939), sage #e3e9dd, sage muda #eef2e9, terakota #ba785a, latar timer #e2e9db.
2. THE system SHALL menggunakan tema gelap dengan warna: background #202822, kartu #283129, sidebar #242d26, teks utama #e1e6d8, teks sekunder #a0aa98, border #3a4539, tombol utama #9fb58d, latar timer #313f2e.
3. THE system SHALL menggunakan font Manrope untuk judul, logo, dan angka timer; DM Sans untuk isi; dengan fallback font sistem.
4. THE system SHALL menggunakan radius kartu sekitar 18px, tombol 8px, jarak antarkartu 24px.
5. THE system SHALL menghindari gradasi mencolok, efek kaca, ilustrasi besar, dan animasi berlebihan.
6. THE system SHALL menampilkan logo bertuliskan "ruang." dengan titik terakota dan empat kotak kecil tersusun 2x2 sedikit diputar (tiga hijau, satu terakota).

## Non-Functional Requirements

### Requirement 9: Batasan Teknis (TC-1, TC-2, TC-3)

**User Story:** Sebagai pengembang, saya ingin batasan teknis yang jelas, sehingga aplikasi tetap ringan dan mudah dideploy.

#### Acceptance Criteria

1. THE system SHALL dibangun dengan HTML untuk struktur, CSS untuk styling, dan Vanilla JavaScript tanpa framework (React, Vue, dll).
2. THE system SHALL tidak memerlukan backend server.
3. THE system SHALL menyimpan seluruh data di sisi klien menggunakan Local Storage API dengan kunci "ruang:v1".
4. THE system SHALL bekerja di browser modern (Chrome, Firefox, Edge, Safari).
5. THE system SHALL dapat dibuka sebagai website statis dan diterbitkan ke GitHub Pages.
6. THE system SHALL menggunakan tepat satu file CSS (css/style.css), satu file JavaScript (js/app.js), dan satu halaman utama (index.html).
7. THE system SHALL menggunakan ikon SVG inline dan favicon lokal di assets/favicon.svg.
8. THE system SHALL tidak memerlukan pemasangan dependensi atau framework pengujian.
9. THE system SHALL memiliki kode yang terformat dan mudah dibaca.

### Requirement 10: Kesederhanaan (NFR-1)

**User Story:** Sebagai pengguna, saya ingin antarmuka yang sederhana dan mudah dipahami, sehingga saya bisa langsung menggunakannya tanpa belajar rumit.

#### Acceptance Criteria

1. THE system SHALL memiliki antarmuka yang bersih dan minimal.
2. THE system SHALL mudah dipahami dan digunakan.
3. THE system SHALL tidak memerlukan setup yang kompleks.
4. THE system SHALL tidak memerlukan setup framework pengujian.

### Requirement 11: Performa (NFR-2)

**User Story:** Sebagai pengguna, saya ingin aplikasi yang responsif dan cepat, sehingga interaksi terasa mulus.

#### Acceptance Criteria

1. THE system SHALL memiliki waktu muat yang cepat.
2. THE system SHALL memiliki interaksi UI yang responsif.
3. THE system SHALL tidak menunjukkan jeda yang terasa saat memperbarui data.

### Requirement 12: Desain Visual (NFR-3)

**User Story:** Sebagai pengguna, saya ingin desain yang estetis dan terbaca, sehingga aplikasi menyenangkan digunakan dalam jangka panjang.

#### Acceptance Criteria

1. THE system SHALL memiliki estetika yang ramah pengguna.
2. THE system SHALL memiliki hierarki visual yang jelas.
3. THE system SHALL memiliki tipografi yang mudah dibaca.

### Requirement 13: Aksesibilitas dan Penyelesaian

**User Story:** Sebagai pengguna, saya ingin semua tombol berfungsi dan aplikasi mendukung aksesibilitas, sehingga saya bisa menggunakannya dengan berbagai cara.

#### Acceptance Criteria

1. THE system SHALL memastikan semua tombol berfungsi.
2. THE system SHALL menggunakan label yang jelas pada elemen interaktif.
3. THE system SHALL menampilkan fokus keyboard yang terlihat.
4. WHEN tombol Escape ditekan, THE system SHALL menutup dialog yang aktif.
5. THE system SHALL mendukung prefers-reduced-motion.
