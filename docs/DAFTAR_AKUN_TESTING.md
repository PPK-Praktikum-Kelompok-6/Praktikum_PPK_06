# 🔐 Daftar Akun Pengujian (Testing Accounts)
## Sistem Presensi Praktikum PPK (Kelompok 6)

> **Catatan Pengujian:**  
> Tombol "Pilih Profil / Ganti Peran Cepat" pada antarmuka aplikasi telah dinonaktifkan demi estetika dan alur autentikasi riil yang profesional.  
> Gunakan kredensial di bawah ini untuk menguji hak akses (RBAC), alur presensi, dan sistem perizinan. Seluruh akun di bawah ini telah terdaftar aktif pada **Firebase Authentication** proyek `ppk-praktikum-3ade8`.

---

## 1. Daftar Akun Pengujian Utama

| Peran | Nama Pengguna | Alamat Email | Kata Sandi | Identitas (NIM / Kode) | Kelas Terdaftar / Wewenang |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 👑 **Administrator** | Administrator Lab PPK | `admin@praktikum.ac.id` | `password123` | `ADM-01` | Pengelola Hak Akses, Persetujuan Sesi, Plotting Asisten |
| 🧪 **Aslab (Baru S4)** | Asisten Laboratorium PPK | `aslab@praktikum.ac.id` | `password123` | `ASL-01` | Manajemen Lab (Single/Bulk Insert), Distribusi & Pindah Anggota, Radius & Denda, Dashboard Lab *(disiapkan pada Sprint 4)* |
| 🛡️ **Asisten 1 (Asprak)** | Muhammad Zaidan Alfarizi | `zaidan@praktikum.ac.id` | `password123` | `AST-01` | Pengampu Kelas C1, B2 |
| 🛡️ **Asisten 2** | Crystiano Bayu Satya Alves | `bayu@praktikum.ac.id` | `password123` | `AST-02` | Pengampu Kelas A1 |
| 🛡️ **Asisten 3** | Herman | `herman@praktikum.ac.id` | `password123` | `AST-03` | Asisten Lab (Siap Ditugaskan) |
| 🎓 **Praktikan 1** | Bahir Ananda Wibowo | `bahir@student.ac.id` | `password123` | `24060124140184` | Kelas A1, B2, C1 |
| 🎓 **Praktikan 2** | Ahmad Dahlan | `ahmad@student.ac.id` | `password123` | `24060124140101` | Kelas A1, C1 |
| 🎓 **Praktikan 3** | Siti Nurhaliza | `siti@student.ac.id` | `password123` | `24060124140102` | Kelas B2, C1 |
| 🎓 **Praktikan 4** | Jeedan | `jeedan@praktikan.ac.id` | `password123` | `24060124130102` | Kelas A1, B2, C1 |

---

## 2. Skenario Pengujian Alur Peran (RBAC Testing)

### Skenario A: Login sebagai Administrator (Role Baru)
1. Buka aplikasi di halaman awal (`/`).
2. Masukkan email: `admin@praktikum.ac.id` dan kata sandi: `password123`.
3. Tekan tombol **"Masuk"**.
4. **Hasil yang Diharapkan:**
   - Sistem secara otomatis mengarahkan ke Dashboard Admin (`/admin`).
   - Admin dapat meninjau & menyetujui pengajuan Reschedule / Hapus Sesi dari Asisten.
   - Admin dapat mengatur & mengubah penugasan asisten ke kelas praktikum (Tab Kelas).
   - Admin dapat menyetujui/menolak pendaftaran akun Asisten baru (Tab Persetujuan Akun).

### Skenario B: Login sebagai Asisten Praktikum
1. Buka aplikasi di halaman awal (`/`).
2. Masukkan email: `zaidan@praktikum.ac.id` dan kata sandi: `password123`.
3. Tekan tombol **"Masuk"**.
4. **Hasil yang Diharapkan:**
   - Sistem mengarahkan ke Dashboard Asisten (`/assistant`).
   - Tampil kartu **"Tanggung Jawab Kelas (Ditetapkan Admin)"** sesuai plotting admin.
   - Tampil kartu **"Persetujuan Praktikan Baru"** untuk menyetujui mahasiswa yang mendaftar ke kelasnya.
   - Sesi praktikum hanya bisa dibuka bila jam mulai telah tercapai.
   - Asisten dapat mengajukan perubahan jadwal (reschedule) atau penghapusan sesi yang akan diteruskan ke Admin untuk persetujuan.

### Skenario C: Login sebagai Praktikan
1. Buka aplikasi di halaman awal (`/`).
2. Masukkan email: `bahir@student.ac.id` dan kata sandi: `password123`.
3. Tekan tombol **"Masuk"**.
4. **Hasil yang Diharapkan:**
   - Sistem mengarahkan ke Dashboard Praktikan (`/student`).
   - Praktikan **hanya melihat dan hanya bisa mengakses kelas yang terdaftar** (enrolled classes).
   - Saat praktikan sudah berhasil presensi, kartu sesi menampilkan label **"Kelas [Kode] • Status Absen Berhasil"**.
   - Saat mengajukan izin (Permit), form permit terhubung langsung ke Firestore dan menampilkan sesi kelas yang valid.

---

## 3. Pendaftaran Akun Baru (Sign Up)

Jika penguji ingin menguji registrasi akun baru mandiri:
1. Klik tab **"Daftar Akun Baru"** pada halaman login.
2. Pilih peran yang diinginkan:
   * **Sebagai Praktikan:**
     - Masukkan Nama Lengkap, **NIM Praktikan**, Email, dan Kata Sandi (minimal 6 karakter).
   * **Sebagai Asisten:**
     - Masukkan Nama Lengkap, Email, dan Kata Sandi.
     - **Kode Asisten tidak perlu diisi manual** — sistem secara otomatis akan mengalokasikan kode asisten berikutnya yang masih luang (misal `AST-03`, `AST-04`, dst.).
3. Tekan tombol **"Daftar dan Masuk"**.
4. Akun baru akan langsung terdaftar di Firebase Authentication dan Firestore Cloud.

---

## 4. Alur Logout yang Aman
1. Pada pojok kanan atas Dashboard (baik Asisten maupun Praktikan), klik tombol Logout (ikon pintu keluar berwarna merah).
2. Sistem akan menampilkan dialog konfirmasi:  
   *"Apakah Anda yakin ingin keluar dari akun?"*
3. Klik **"Batal"** untuk membatalkan, atau klik **"Ya, Keluar"** untuk mengakhiri sesi dan kembali ke halaman login.

---

## 5. Skenario Pengujian Sprint 4 (Pertemuan 9)

### Skenario D: Login sebagai Aslab (`ASLAB` — Role Baru)
1. Login dengan akun Aslab (`aslab@praktikum.ac.id` / `password123`) → diarahkan otomatis ke `/aslab`.
2. **Manajemen Lab & 3 Bulk Insert Terpisah:**
   - Unduh template CSV masing-masing untuk Lab (per 1 mata kuliah), Praktikan ke Lab, dan Asprak ke Lab.
   - Import file CSV → pastikan tiap baris tampil sebagai list di dalam `ScrollView` yang dapat diatur (Accept / Deny / Edit / Isi field kosong) sebelum disimpan ke Firestore.
   - Uji konfigurasi lokasi, koordinat, cakupan radius presensi, *grace period* keterlambatan, dan nominal denda tetap.
   - Uji perpindahan praktikan antar lab serta perpindahan aslab/asprak (tanpa perpindahan jadwal).
3. **Dashboard Keberlangsungan Lab:**
   - Verifikasi tampilan jumlah lab & praktikan, status tiap lab, lokasi & waktu, jadwal berlangsung & mendatang, riwayat kegiatan, dan riwayat keuangan hasil denda.
   - Ganti filter **Hari / Minggu / Bulan** dan pastikan data berubah sesuai periode.

### Skenario E: Pengelolaan Sesi Asprak, Keterlambatan (Grace Period), Denda & Excused Absence
1. Login sebagai Asprak (`zaidan@praktikum.ac.id`) → pastikan hanya kelas/sesi tanggung jawabnya yang tampil dan **tidak ada** menu manajemen distribusi/konfigurasi seluruh lab.
2. Buka sesi praktikum → verifikasi perubahan status `OPEN` langsung tersinkron real-time di perangkat Praktikan.
3. **Presensi Tepat Waktu:** Praktikan absen sebelum/tepat akhir *grace period* → status `ON_TIME`, tidak ada tagihan denda.
4. **Presensi Terlambat:** Praktikan absen melewati *grace period* → status `LATE`, terbentuk **tepat 1 tagihan denda** nominal tetap di Firestore, dan praktikan menerima notifikasi tagihan baru.
5. **Izin Disetujui (*Excused Absence*):** Asprak menyetujui izin praktikan → status tercatat `EXCUSED_ABSENCE` (bukan hadir) dan praktikan dibebaskan dari denda.

### Skenario F: Pembayaran Denda Midtrans Sandbox, Webhook, & Riwayat Persisten
1. Login sebagai Praktikan yang memiliki tagihan denda → buka tab **Denda / Pembayaran**.
2. Tekan **Bayar Sekarang** → aplikasi memanggil backend server untuk membuat transaksi Snap Sandbox → buka halaman pembayaran Midtrans Sandbox.
3. Simulasikan pembayaran melalui Midtrans Sandbox Simulator (uji status `pending`, `success`/settlement, dan `failed`/expire).
4. Verifikasi backend menerima webhook & memverifikasi signature → status tagihan dan pembayaran terbarui di Firestore, **status kehadiran praktikan tetap `LATE`**, dan praktikan menerima notifikasi hasil pembayaran.
5. Tutup total aplikasi lalu buka kembali → pastikan **Riwayat Pembayaran** (sesi, tanggal tagihan, nominal, waktu transaksi, status) tetap tampil persisten.
