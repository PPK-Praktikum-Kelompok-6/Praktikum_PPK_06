# 🔐 Daftar Akun Pengujian (Testing Accounts)
## Sistem Presensi Praktikum PPK (Kelompok 6)

> **Catatan Pengujian:**  
> Tombol "Pilih Profil / Ganti Peran Cepat" pada antarmuka aplikasi telah dinonaktifkan demi estetika dan alur autentikasi riil yang profesional.  
> Gunakan kredensial di bawah ini untuk menguji hak akses (RBAC), alur presensi, dan sistem perizinan. Seluruh akun di bawah ini telah terdaftar aktif pada **Firebase Authentication** proyek `ppk-praktikum-3ade8`.

---

## 1. Daftar Akun Pengujian Utama

| Peran | Nama Pengguna | Alamat Email | Kata Sandi | Identitas (NIM / Kode) | Kelas Terdaftar |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 🛡️ **Asisten 1** | Muhammad Zaidan Alfarizi | `zaidan@praktikum.ac.id` | `password123` | `AST-01` | Pengampu Kelas C1, B2 |
| 🛡️ **Asisten 2** | Crystiano Bayu Satya Alves | `bayu@praktikum.ac.id` | `password123` | `AST-02` | Pengampu Kelas A1 |
| 🎓 **Praktikan 1** | Bahir Ananda Wibowo | `bahir@student.ac.id` | `password123` | `24060124140184` | Kelas A1, B2, C1 |
| 🎓 **Praktikan 2** | Ahmad Dahlan | `ahmad@student.ac.id` | `password123` | `24060124140101` | Kelas A1, C1 |
| 🎓 **Praktikan 3** | Siti Nurhaliza | `siti@student.ac.id` | `password123` | `24060124140102` | Kelas B2, C1 |

---

## 2. Skenario Pengujian Alur Peran (RBAC Testing)

### Skenario A: Login sebagai Asisten Praktikum
1. Buka aplikasi di halaman awal (`/`).
2. Masukkan email: `zaidan@praktikum.ac.id` dan kata sandi: `password123`.
3. Tekan tombol **"Masuk"**.
4. **Hasil yang Diharapkan:**
   - Sistem secara otomatis mengarahkan rute ke Dashboard Asisten (`/assistant`).
   - Tampil jadwal praktikum yang diampu oleh Zaidan (Kelas C1 & B2).
   - Asisten memiliki akses untuk membuka/menutup sesi praktikum dan melihat rekap presensi serta review perizinan AI.

### Skenario B: Login sebagai Praktikan
1. Buka aplikasi di halaman awal (`/`).
2. Masukkan email: `bahir@student.ac.id` dan kata sandi: `password123`.
3. Tekan tombol **"Masuk"**.
4. **Hasil yang Diharapkan:**
   - Sistem secara otomatis mengarahkan rute ke Dashboard Praktikan (`/student`).
   - Tampil daftar praktikum kelas yang diikuti oleh Bahir.
   - Praktikan memiliki akses untuk melakukan presensi (anti-bocor) dan mengajukan izin ketidakhadiran dengan analisis AI.

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
