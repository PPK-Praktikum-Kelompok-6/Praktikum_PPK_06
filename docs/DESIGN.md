# Dokumentasi UI Design System

> **Owner:** Crystiano Bayu Satya Alves (NIM: 24060124140130)  
> **Tema:** Royal Violet & Cotap Midnight (Terinspirasi dari referensi Cotap / Mobbins)  
> **Target Platform:** iOS, Android, Web (Expo SDK 57 / React Native)

Dokumen ini merupakan panduan dan spesifikasi standar visual untuk seluruh anggota kelompok (Zaidan, Bayu, Bahir). Seluruh komponen antarmuka harus mematuhi token dan aturan di bawah ini agar konsistensi aplikasi presensi tetap seragam.

---

## 1. Prinsip Desain

1. **Modern & Non-Boring (Tactile Interactivity)**  
   Menghindari tampilan monokrom yang datar dan sepi. Menggunakan perpaduan warna Midnight Violet (`#1E1035`) dan Royal Violet (`#6D28D9`) dengan highlight kaca (*frosted glass border* `rgba(255,255,255,0.16)`) serta efek sentuh (*pressed scale* 0.985 dan ripple pulse).

2. **Aksesibilitas (WCAG AA Compliance)**  
   Seluruh perpaduan warna teks dan latar belakang wajib memiliki rasio kontras minimal **4.5:1**:
   - Teks status hijau menggunakan `#166534` (bukan `#16A34A` yang silau pada latar terang).
   - Teks peringatan menggunakan `#92400E` pada latar `#FEF3C7`.
   - Teks bahaya/error menggunakan `#991B1B` pada latar `#FEE2E2`.

3. **Floating Navigation Shell**  
   Navbar utama didesain sebagai floating pill / capsule yang melayang di atas konten dengan sudut melengkung penuh (`borderRadius: 32`), elevasi bayangan halus, serta indikator aktif berupa lingkaran solid (`#6D28D9`) dengan ikon putih.

4. **Single Source of Truth**  
   Tidak diperkenankan melakukan *hardcode* nilai hex warna atau margin angka di sembarang komponen fitur. Seluruh komponen wajib mengimpor token dari `@/constants/theme`.

---

## 2. Token Desain (`src/constants/theme.ts`)

### 2.1 Palet Warna (Color Palette)

| Token | Hex / Nilai | Peruntukan |
| :--- | :--- | :--- |
| `Colors.midnight` | `#210F63` | Background hero banner aktif (Cotap Deep Indigo) |
| `Colors.midnightSurface`| `#391E9E` | Surface sekunder pada hero card |
| `Colors.primary` | `#5838DF` | Warna utama brand (Electric Royal Indigo-Violet), tombol aksi utama |
| `Colors.primaryDark` | `#371C96` | Aksen ungu-indigo pekat |
| `Colors.primaryLight` | `#7C5CFF` | Aksen terang, highlight interaktif |
| `Colors.heroGradient` | `radial-gradient(...) + linear-gradient(...)` | Gradasi Hero Card Cotap dengan spotlight glow di kiri atas |
| `Colors.primaryBg` | `#EDE9FE` | Latar belakang tombol sekunder & badge lavender halus |
| `Colors.primaryGhost` | `#F5F3FF` | Latar selang-seling item list |
| `Colors.background` | `#F8FAFC` | Latar belakang utama aplikasi (Slate 50) |
| `Colors.surface` | `#FFFFFF` | Latar belakang card default, modal sheet, floating navbar |
| `Colors.surfaceSecondary`| `#F1F5F9`| Latar belakang track progress bar, tombol abu-abu |
| `Colors.text` | `#0F172A` | Teks judul utama & angka (Slate 900) |
| `Colors.textSecondary` | `#475569` | Teks keterangan sedang (Slate 600) |
| `Colors.textMuted` | `#64748B` | Teks caption, tanggal, status pasif (Slate 500) |
| `Colors.textWhite` | `#FFFFFF` | Teks di atas hero card atau tombol primer |
| `Colors.border` | `#E2E8F0` | Border tipis pembatas card dan input |
| `Colors.glassHighlight` | `rgba(255,255,255,0.22)`| Highlight border putih pada card midnight |
| `Colors.success` | `#166534` | Teks status `OPEN` / Presensi Berhasil |
| `Colors.successBg` | `#DCFCE7` | Latar status `OPEN` |
| `Colors.warning` | `#92400E` | Teks status `WAITING` / Peringatan |
| `Colors.warningBg` | `#FEF3C7` | Latar status `WAITING` |
| `Colors.danger` | `#991B1B` | Teks status error / Tutup sesi |
| `Colors.dangerBg` | `#FEE2E2` | Latar status error |
| `Colors.info` | `#1E40AF` | Teks status `ATTENDED` / Hadir |
| `Colors.infoBg` | `#DBEAFE` | Latar status `ATTENDED` |

### 2.2 Tipografi (Typography)

| Ukuran | Nilai (dp) | Bobot Rekomendasi | Penggunaan |
| :--- | :--- | :--- | :--- |
| `Typography.hero` | 32 | `FontWeights.bold` (700) | Judul hero modul praktikum, jam check-in |
| `Typography.xxl` | 26 | `FontWeights.bold` (700) | Judul halaman utama |
| `Typography.xl` | 20 | `FontWeights.semibold` (600) | Sub-header section, judul modal |
| `Typography.lg` | 17 | `FontWeights.semibold` (600) | Judul card sesi praktikum |
| `Typography.md` | 15 | `FontWeights.regular` (400) | Body teks standar, tombol ukuran medium |
| `Typography.sm` | 13 | `FontWeights.regular` (400) | Keterangan modul, badge, tombol kecil |
| `Typography.xs` | 11 | `FontWeights.medium` (500) | Caption kecil, timestamp, label tanggal |

### 2.3 Spacing & Radius

- **Spacing:** `xs: 4`, `sm: 8`, `md: 16`, `lg: 24`, `xl: 32`, `xxl: 40`
- **Radius:** `sm: 8`, `md: 14`, `lg: 20`, `xl: 28`, `full: 9999`
- **Shadows:** Tersedia preset `Shadows.sm`, `Shadows.md`, `Shadows.lg`, dan `Shadows.floatingNav`.

---

## 3. Katalog Komponen Siap Pakai (`src/components/ui/`)

Semua komponen berikut dibuat generik, decoupled dari store/business logic, dan dapat langsung digunakan oleh anggota tim:

### 3.1 `Screen`
Wadah dasar halaman dengan dukungan safe-area otomatis (`react-native-safe-area-context`), scroll, pull-to-refresh, dan padding bawah otomatis agar tidak tertutup floating navbar.
```tsx
import { Screen } from '@/components/ui/Screen';

<Screen withBottomNavPadding onRefresh={fetchData} refreshing={isRefreshing}>
  {/* Konten Halaman */}
</Screen>
```

### 3.2 `CustomButton`
Tombol interaktif dengan feedback sentuh (*pressed scale*), loading spinner, dan dukungan icon.
```tsx
import { CustomButton } from '@/components/ui/CustomButton';

<CustomButton
  title="Buka Sesi Presensi"
  variant="primary" // 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'hero'
  size="md"        // 'sm' | 'md' | 'lg'
  loading={loading}
  onPress={handleOpen}
/>
```

### 3.3 `Card`
Kontainer dengan sudut melengkung dan varian visual:
```tsx
import { Card } from '@/components/ui/Card';

// Varian Hero (Midnight Violet + Glass Highlight)
<Card variant="hero" padding="lg">
  <AppText variant="hero" color={Colors.textWhite}>Modul 1</AppText>
</Card>

// Varian Standar (Surface putih dengan border dan soft shadow)
<Card variant="default" padding="md" onPress={handleClick}>
  <AppText variant="title">Sesi Struktur Data</AppText>
</Card>
```

### 3.4 `Badge`
Badge status presensi terstandarisasi dengan visual dot indikator aktif.
```tsx
import { Badge } from '@/components/ui/Badge';

<Badge label="DIBUKA" variant="open" showDot />
<Badge label="TERTUTUP" variant="closed" />
<Badge label="SUDAH HADIR" variant="attended" />
<Badge label="MENUNGGU" variant="waiting" />
```

### 3.5 `EmptyState`
Tampilan kosong yang rapi saat daftar sesi atau riwayat presensi belum ada data.
```tsx
import { EmptyState } from '@/components/ui/EmptyState';

<EmptyState
  title="Belum Ada Sesi"
  message="Saat ini belum ada sesi praktikum yang sedang aktif."
  iconName="calendar-outline"
  actionLabel="Segarkan Data"
  onAction={refresh}
/>
```

### 3.6 `FeedbackModal`
Dialog konfirmasi atau notifikasi umpan balik aksi (sukses presensi, sesi tertutup, konfirmasi keluar).
```tsx
import { FeedbackModal } from '@/components/ui/FeedbackModal';

<FeedbackModal
  visible={isOpen}
  type="success" // 'success' | 'error' | 'warning' | 'info'
  title="Presensi Berhasil!"
  message="Kehadiran Anda telah tercatat pada pukul 08:31 WIB."
  primaryLabel="Tutup"
  onPrimary={() => setIsOpen(false)}
/>
```

### 3.7 `ProgressBar`
Indikator progress keterisian kuota atau durasi waktu sesi.
```tsx
import { ProgressBar } from '@/components/ui/ProgressBar';

<ProgressBar progress={75} variant="primary" size="md" />
```

### 3.8 `Icon`
Wrapper typed untuk icon cross-platform (Ionicons) dari `@expo/vector-icons`.
```tsx
import { Icon } from '@/components/ui/Icon';

<Icon name="checkmark-circle" size={24} color={Colors.success} />
```

---

## 4. Pola Navigasi Compact Floating Pill (`src/components/ui/FloatingTabBar.tsx`)

Tab bar menggunakan komponen `FloatingTabBar` yang lebarnya otomatis mengikuti jumlah menu:
- **Posisi:** `position: 'absolute'`, `bottom: Math.max(insets.bottom, 16)`, `alignItems: 'center'`.
- **Lebar Kapsul:** Otomatis membungkus jumlah item menu (`flexDirection: 'row'`, `padding: 6`, `gap: 8`, `borderRadius: 999`), tidak melebar penuh satu layar.
- **Indikator Tab Aktif:** Lingkaran ungu solid (`48×48`, `borderRadius: 24`, `backgroundColor: #5838DF`) dengan ikon putih di tengahnya.
- **Indikator Tab Tidak Aktif:** Lingkaran abu lembut (`48×48`, `backgroundColor: #F1F5F9`) dengan ikon slate gelap (`#334155`).

---

## 5. UI Gallery Interaktif (`/ui-gallery`)

Aplikasi menyediakan rute khusus `src/app/ui-gallery.tsx` yang dapat diakses langsung oleh tim pengembang melalui tombol **"Buka UI Gallery"** di layar awal atau navigasi langsung ke `/ui-gallery`.
Di gallery ini tim dapat menguji langsung:
1. Seluruh palet warna swatch.
2. Interaksi *Concentric Ripple Check-in button*.
3. Variasi Card, Button, dan Badge.
4. Uji coba memicu Modal Feedback (sukses, error, warning).
5. Tampilan Empty State.

