# Verifikasi Ruang — 28 Oktober 2026

Pemeriksaan dilakukan pada hasil terakhir Kiro, lalu diulang pada perbaikan di branch `codex/perbaiki-bug-ruang`. Data pengujian dibuat terpisah pada alamat lokal port 8768; data tersebut tidak disertakan sebagai data awal aplikasi.

## Hasil otomatis

28 dari 28 skenario regresi lulus menggunakan DOM dan LocalStorage simulasi, waktu yang dapat dikendalikan, serta kode aplikasi sebenarnya. Ini menguji logika, bukan menggantikan pemeriksaan browser.

- Aplikasi mulai, jam berjalan, pintasan dan input tugas merespons.
- Pengaturan tersimpan setelah refresh; durasi baru berlaku pada timer belum dimulai atau setelah Reset.
- Sisa waktu dan ID sesi jeda bertahan setelah refresh.
- Dua sesi berurutan mempunyai ID berbeda; sesi selesai yang dibuka kembali tidak dipakai ulang. Timer tidak selesai sebelum tenggat tepatnya. Istirahat dan Reset tidak menambah sesi fokus.
- Cadangan valid memerlukan konfirmasi; 16 variasi data tidak valid ditolak tanpa mengganti data aktif. Data browser tidak dikenal tetap dipertahankan. Kegagalan penyimpanan saat impor mengembalikan state sebelumnya.
- Teks berisi tanda kutip tetap menjadi teks, tidak membentuk atribut HTML aktif.
- Statistik memakai tanggal lokal, prioritas Tinggi diurutkan benar, dan tugas aktif berada sebelum tugas selesai.
- Judul ganda ditolak tanpa menutup dialog edit. Sinkronisasi antar-tab tidak menulis balik atau crash pada data null/tidak valid.
- Checkbox dapat digunakan dengan Space/Enter, mempunyai nama tugas, dan mempertahankan fokus keyboard.
- Sapaan mengikuti pergantian waktu. Pemilih tugas mengikuti perubahan tugas tanpa memulai ulang timer. Beberapa tombol Urungkan mengembalikan itemnya masing-masing.
- Simpan dan Batal menjalankan tindakan yang sesuai. Menu mengubah halaman, isi yang tampil, URL, breadcrumb, dan status aktif tanpa mengganti data tugas atau tenggat timer.
- Riwayat sesi menampilkan nama tugas, tanggal, durasi, dan penambahan 20 sesi berikutnya. Pintasan memakai tautan HTTP(S), target tab baru, serta `noopener noreferrer`; tombol edit terpisah dari tautannya.
- Pencarian kosong memberikan penjelasan dan tombol untuk memulihkan semua tugas. Timer ringkas membuka overlay serta mengikuti Jeda/Reset.

Label hari grafik juga diperiksa terpisah dalam zona `America/Los_Angeles` dan lulus. Kasus navigasi diulang setelah perubahan posisi gulir dan lulus. Pemeriksaan sintaks JavaScript serta kebersihan diff lulus.

## Hasil browser

Diuji langsung di browser bawaan Codex, dengan server statis lokal dan data uji:

- Dua sesi fokus nyata, masing-masing 1 menit, selesai dan menghasilkan 2 sesi / 2 menit. Tugas terkait menampilkan 2 sesi fokus.
- Timer dijeda, halaman dimuat ulang, lalu dilanjutkan. Sisa waktu dipertahankan.
- Simpan pengaturan mengubah timer ke 01:00; Batal tidak mengganti nama. Durasi dikembalikan ke 25/5 setelah pengujian.
- Edit judul ganda menampilkan penolakan dan dialog tetap terbuka; Batal menutupnya.
- Checkbox melalui tombol Space memperbarui status dan fokus keyboard tetap pada tugas.
- Ruang fokus dari sidebar dan ikon tugas membuka overlay; Escape menutup dan mengembalikan fokus. Setiap menu membuka halaman yang berbeda. Tombol Kembali browser mengembalikan halaman sebelumnya.
- Ringkasan terlihat penuh di bawah header. Dua kolom kartu berdiri mandiri sehingga celah di bawah kartu tugas berkurang. Profil di header dihapus sehingga hanya ada satu identitas di sidebar.
- Palet terang/gelap mencakup latar aktif/hover, badge, tombol, dan teks pendukung. Pengukuran 25 sampel teks per tema (termasuk menu, metadata tugas, label, deskripsi, placeholder, dan tombol) memberikan rasio minimum 4,53:1 di tema terang dan 5,74:1 di tema gelap. Seluruh sampel melewati 4,5:1. Ini bukan audit aksesibilitas seluruh aplikasi.
- Grafik yang sebelumnya nyaris rata diperbaiki; batang hari dengan 2 menit memiliki tinggi yang nyata dan label nilai.
- Pencarian tanpa hasil menampilkan penjelasan dan tombol pemulihan. Halaman Pintasan berhasil menambah, menghapus, dan mengurungkan pintasan uji. Tautan uji membuka halaman lokal pada tab baru; tab tersebut dikonfirmasi melalui inventaris tab dan diperiksa langsung. Tombol Kelola pintasan di Ringkasan membuka halaman pengelolaannya.
- Ikon GitHub, Gmail, YouTube, dan Figma memiliki warna teks, latar, dan border yang identik pada tema terang/gelap.
- Perubahan tema tersinkron ke tab kedua.
- Ekspor saat timer berjalan menghasilkan salinan jeda dengan sisa waktu presisi, sementara timer halaman tetap berjalan. Impor cadangan rusak ditolak; ekspor dengan 2 tugas, 4 pintasan, dan 2 sesi berhasil diimpor kembali setelah konfirmasi.
- Versi desain akhir diperiksa pada empat halaman, dua tema, dan lima lebar (320, 390, 768, 1280, 1440): 40 kombinasi tanpa dokumen melebar ke samping. Pemeriksaan sebelumnya juga mencakup perpindahan halaman saat timer aktif. Tampilan desktop dan HP diperiksa visual. Navigasi HP pada 320 piksel muat tanpa gulir mendatar.
- Timer tetap berjalan selama berpindah halaman dan setelah refresh. Tombol timer di header membuka kontrol sesi; Jeda/Reset berfungsi.
- Tidak ada pesan error atau warning JavaScript pada pemeriksaan akhir tab uji.

Tambahan setelah fitur sidebar ringkas: tombol di kanan logo diuji pada lebar 1334 dan 1024 piksel. Sidebar menyusut ke 76 piksel, label dan avatar tersembunyi, ikon Aktivitas tetap membuka halamannya, dan ikon Pengaturan tetap membuka dialog. Tombol dapat memperluas sidebar lagi; pilihan ringkas bertahan setelah refresh. Pada lebar 1020 piksel sidebar otomatis menjadi ikon tanpa tombol, sedangkan pada 390 piksel navigasi HP tetap tampil tanpa halaman melebar. Tampilan ringkas juga diperiksa pada tema gelap.

## Pemeriksaan desain

- Keseimbangan: kartu disusun dalam dua kolom mandiri; pintasan ringkasan memakai ubin ringkas agar bobotnya seimbang dengan tugas, timer, dan grafik.
- Hierarki: judul halaman menyebut fungsi, diikuti judul kartu dan keterangan. Teks tugas dan label kecil diperbesar.
- Keselarasan: isi halaman dan kartu memakai garis awal serta jarak yang konsisten; halaman detail menggunakan lebar ruang kerja yang sama.
- Kontras: teks, checkbox, logo, placeholder, dan keadaan hover diperjelas. Ikon aplikasi favorit mempertahankan warnanya.
- Konsistensi: tombol Edit/Hapus di halaman Pintasan dan Fokus/Edit/Hapus pada daftar tugas desktop memiliki label. Menu serta tombol pengelolaan memperjelas tujuan tindakan.
- Proporsi: informasi ringkas berada di Ringkasan; rincian alamat dan riwayat sesi berada pada halaman masing-masing. Identitas profil tampil satu kali di sidebar.

## Batas pemeriksaan

Suara belum dikonfirmasi terdengar melalui perangkat pengguna. Belum diuji langsung di Safari, Firefox, Edge, perangkat HP fisik, atau GitHub Pages. Perilaku file lokal bergantung pada kebijakan penyimpanan masing-masing browser; server statis disarankan. Google Fonts membutuhkan internet dan memiliki font sistem cadangan.

Kode dan commit disimpan lokal; belum di-push atau diterbitkan. File konfigurasi lokal `.kiro/specs/ruang/.config.kiro` tidak disertakan dalam commit.
