# Dokumentasi UI Design System

> **Owner:** Crystiano Bayu Satya Alves (NIM: 24060124140130)  
> **Tema:** Royal Violet & Cotap Midnight (Terinspirasi dari referensi Cotap / Mobbins)  
> **Target Platform:** iOS, Android, Web (Expo SDK 58 · React Native 0.88)

Dokumen ini merupakan panduan dan spesifikasi standar visual untuk seluruh anggota kelompok (Zaidan, Bayu, Bahir). Seluruh komponen antarmuka harus mematuhi token dan aturan di bawah ini agar konsistensi aplikasi presensi tetap seragam.

---

## 1. Prinsip Desain

1. **Modern & Non-Boring (Tactile Interactivity)**  
   Menghindari tampilan monokrom yang datar dan sepi. Menggunakan perpaduan warna Midnight Violet (`#210F63`) dan Royal Indigo-Violet (`#5838DF`) dengan highlight kaca (*frosted glass border* `rgba(255,255,255,0.28)`), aset *soft mesh gradient*, *grainy 2D blobs*, serta efek sentuh (*pressed scale* 0.985 dan *concentric ripple pulse*).

2. **Aksesibilitas (WCAG AA Compliance)**  
   Seluruh perpaduan warna teks dan latar belakang wajib memiliki rasio kontras minimal **4.5:1**:
   - Teks status hijau menggunakan `#166534` (bukan `#16A34A` yang silau pada latar terang).
   - Teks peringatan menggunakan `#92400E` pada latar `#FEF3C7`.
   - Teks bahaya/error menggunakan `#991B1B` pada latar `#FEE2E2`.

3. **Floating Navigation Shell**  
   Navbar utama didesain sebagai *frosted glass floating pill / capsule* yang melayang di atas konten dengan sudut melengkung penuh (`borderRadius: 9999`), elevasi bayangan halus, serta indikator aktif berupa lingkaran solid (`#5838DF`) dengan ikon putih.

4. **Single Source of Truth**  
   Tidak diperkenankan melakukan *hardcode* nilai hex warna, margin angka, maupun path `require()` aset gambar di sembarang komponen fitur. Seluruh komponen wajib mengimpor token dari `@/constants/theme`.

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
| `Colors.background` | `#F4F3FA` | Latar belakang utama aplikasi (Soft Lavender-Slate) |
| `Colors.surface` | `#FFFFFF` | Latar belakang card flat & modal sheet |
| `Colors.glassSurface` | `rgba(255,255,255,0.72)` | Permukaan kaca buram (`Card variant="glass"`) |
| `Colors.glassSurfaceStrong`| `rgba(255,255,255,0.84)`| Permukaan kaca terang (`Card variant="default"`) |
| `Colors.glassBorder` | `rgba(255,255,255,0.88)` | Specular white border pada kartu kaca |
| `Colors.surfaceSecondary`| `#F1F5F9`| Latar belakang track progress bar, tombol abu-abu |
| `Colors.text` | `#0F172A` | Teks judul utama & angka (Slate 900) |
| `Colors.textSecondary` | `#475569` | Teks keterangan sedang (Slate 600) |
| `Colors.textMuted` | `#64748B` | Teks caption, tanggal, status pasif (Slate 500) |
| `Colors.textWhite` | `#FFFFFF` | Teks di atas hero card atau tombol primer |
| `Colors.border` | `#E2E8F0` | Border tipis pembatas card dan input |
| `Colors.glassHighlight` | `rgba(255,255,255,0.28)`| Highlight border putih pada card midnight |
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

- **Spacing:** `xxs: 2`, `xs: 4`, `sm: 8`, `md: 16`, `lg: 24`, `xl: 32`, `xxl: 40`
- **Radius:** `xs: 4`, `sm: 8`, `md: 14`, `lg: 20`, `xl: 28`, `full: 9999`
- **Shadows:** Tersedia preset `Shadows.none`, `Shadows.sm`, `Shadows.md`, `Shadows.lg`, dan `Shadows.floatingNav`.

---

### 2.4 Paket Aset Visual & Ikon Gestur (`GradientMeshes`, `GradientShapes`, `HandGestureIcons`)

Design System mengadopsi tiga paket aset grafis terkurasi yang disimpan di dalam `assets/images/{gradients,shapes,gestures}/` (dioptimasi ke resolusi mobile `512×512px` dengan *radial Gaussian alpha window* untuk gradasi dan `256×256px` `@4x` dari SVG untuk ikon) serta diekspor melalui `@/constants/theme`.

#### A. Paket 1: `Grads - Pack of soft gradients` (`GradientMeshes`)
Berisi 10 *soft atmospheric mesh gradients* dengan tekstur *subtle noise* di atas latar transparan. Digunakan sebagai latar *ambient* di belakang lapisan kaca (*frosted glass*) atau *card backdrop*.

| Token (`GradientMeshes.*`) | File Bundled (`assets/images/gradients/`) | Sumber Asli (`Grads/PNGs/`) | Karakteristik Palet | Penggunaan di UI |
| :--- | :--- | :--- | :--- | :--- |
| `GradientMeshes.violet` | `mesh-violet-v2.png` | `Mesh 7.png` | Deep Violet, Magenta-Rose, Soft Lavender | Latar *ambient* utama brand Royal Violet & Hero Banner |
| `GradientMeshes.indigo` | `mesh-indigo.png` | `Mesh 9.png` | Royal Blue-Indigo, Soft Peach-Pink | Latar *ambient* `Screen` di balik `FloatingTabBar` |
| `GradientMeshes.pastel` | `mesh-pastel.png` | `Mesh 1.png` | Pastel Cyan, Lavender, Coral, Pale Yellow | Latar lembut di balik `Card variant="glass"` |
| `GradientMeshes.emerald` | `mesh-emerald.png` | `Mesh 3.png` | Teal-Mint, Soft Yellow, Warm Coral | Aksen latar sesi praktikum berstatus `OPEN` |

**Referensi Katalog Lengkap Paket `Grads - Pack of soft gradients` (10 Variasi):**
- `Mesh 1.png` – Pastel Cyan (kiri bawah), Lavender-Violet (kanan bawah), Coral-Pink (kiri atas), Pale Yellow (tengah-kanan).
- `Mesh 2.png` – Serupa `Mesh 1` dengan transisi Coral-Pink lebih luas di tengah dan biru langit di bawah.
- `Mesh 3.png` – Teal-Emerald di puncak atas, Kuning lembut di kiri-tengah, dan kubah Coral-Red di bawah.
- `Mesh 4.png` – Gradasi hangat Amber-Orange ke Coral-Red di tengah dan Kuning pucat di tepi kanan.
- `Mesh 5.png` – Mint-Teal lembut di kanan atas melebur ke Coral-Pink di tengah-bawah dan kuning pucat di kiri bawah.
- `Mesh 6.png` – Cobalt Blue elektrik di kiri bawah, Kuning keemasan di kanan atas, dan Magenta pekat di kanan bawah.
- `Mesh 7.png` – Deep Royal Violet di kanan-tengah, Magenta di kiri bawah, dan Cream-Yellow lembut di kiri atas.
- `Mesh 8.png` – *Warm Sunset*: Kuning lembut di kanan atas, Oranye menyala di tengah, dan Rose-Pink di kiri bawah.
- `Mesh 9.png` – Perpaduan kontras Peach-Pink lembut di sisi kiri dengan Royal Cobalt Blue di sisi kanan.
- `Mesh 10.png` – *Multi-spectrum*: Kuning-Oranye di kiri atas, Coral-Violet di kanan, dan Teal-Blue di bagian bawah.

#### B. Paket 2: `Grads V2` — *Grainy 2D Shapes & Blobs* (`GradientShapes`)
Berisi 17 bentuk geometris & organik 2D dengan efek *heavy stippled grain*. Digunakan sebagai stiker dekoratif, aksen sudut *Hero Card*, maupun ilustrasi status (`EmptyState`, `FeedbackModal`).

| Token (`GradientShapes.*`) | File Bundled (`assets/images/shapes/`) | Sumber Asli (`Grads V2/PNGs/`) | Bentuk & Gradasi | Penggunaan di UI |
| :--- | :--- | :--- | :--- | :--- |
| `GradientShapes.heroBlob` | `grad-01-hero-v2.png` | `Grad_01.png` | *Heart/Shield Blob* (Electric Blue → Violet → Magenta) | Ornamen dekoratif utama / *Role Selection* & *Hero Card* |
| `GradientShapes.warningBean`| `grad-03-warning.png` | `Grad_03.png` | *Crescent Bean* (Electric Violet → Orange → Warm Yellow) | Aksen visual status `NOT_STARTED` (*Belum Dimulai*) |
| `GradientShapes.droplet` | `grad-04-droplet.png` | `Grad_04.png` | *Organic Droplet* (Deep Indigo → Magenta → Soft Peach) | Ilustrasi dekoratif `EmptyState` & kartu profil asisten |
| `GradientShapes.spark` | `grad-10-spark.png` | `Grad_10.png` | *Lightning / Double Arrow* (Orange-Red → Soft Peach) | Ornamen perhatian / peringatan pada `FeedbackModal` |
| `GradientShapes.sphere` | `grad-15-sphere.png` | `Grad_15.png` | *Soft Sphere* (Deep Indigo → Sky Cyan → Lavender) | *Ambient orb* di belakang `RippleCheckIn` |
| `GradientShapes.successWave`| `grad-16-success.png` | `Grad_16.png` | *Hourglass Semicircles* (Pale Yellow → Mint → Cyan) | Aksen visual status `OPEN` / presensi berhasil |

**Referensi Katalog Lengkap Paket `Grads V2` (17 Variasi):**
- `Grad_01.png` – *Heart/Shield Organic Blob* (Cyan → Royal Blue → Magenta-Violet).
- `Grad_02.png` – *Rounded Squircle* (Mint White di kiri → Bright Cyan → Electric Blue di kanan atas).
- `Grad_03.png` – *Crescent Bean* (Putih-Kuning di kiri → Warm Orange di tengah → Electric Violet di kanan).
- `Grad_04.png` – *Teardrop / Droplet Bean* (Deep Indigo di kiri bawah → Magenta di tengah → Peach di kanan atas).
- `Grad_05.png` – *Horizontal Pebble Blob* (Hot Pink di kiri → Warm Orange di tengah → Pale Cream di kanan).
- `Grad_07.png` – *Stacked Double-Pill / Figure-8* (Cyan-Blue di bawah → Neon Mint Green di tengah → Pale Yellow di atas).
- `Grad_08.png` – *Diagonal Semicircle Wedge* (Vivid Orange-Red memudar ke Pale Yellow di sisi diagonal).
- `Grad_09.png` – *Two-Lobed Heart Blob* (Electric Purple-Blue di kiri, Coral-Red di kanan, cahaya kuning di bawah).
- `Grad_10.png` – *Lightning Bolt / Double Arrow* (Bright Orange-Red di tengah memudar ke ujung Peach).
- `Grad_11.png` – *5-Lobed Starflower Blob* (Hot Pink di tengah, tepi Kuning-Oranye hangat).
- `Grad_12.png` – *Equilateral Triangle* (Cyan-Blue di puncak atas, Mint Green di tengah, memudar ke putih di kiri bawah).
- `Grad_13.png` – *8-Petal Cloud Flower* (Magenta-Coral di tengah dikelilingi kelopak Golden Yellow).
- `Grad_14.png` – *Tilted Egg / Oval* (Deep Violet-Blue di kiri bawah → Fiery Orange-Red di tengah → Bright Yellow di kanan atas).
- `Grad_15.png` – *Diffused Sphere / Circle* (Deep Indigo di bawah, Sky Cyan di tengah, Lavender di kanan, putih di puncak).
- `Grad_16.png` – *Hourglass / Opposing Semicircles* (Pale Yellow di atas → Mint Green di tengah → Cyan-Blue di bawah).
- `Grad_17.png` – *C-Shaped Crescent Swirl* (Sky Blue & Royal Blue di tengah dengan tepi luar Mint Green).
- `Grad_18.png` – *3-Tiered Stacked Wave Squiggle* (Vivid Red-Pink di atas → Orange di tengah → Pale Cream di bawah).

#### C. Paket 3: `Hand-Gest` — *Monoline Interactive Hand Gesture Icons* (`HandGestureIcons`)
Berisi 50 ikon gestur tangan bergaya *monoline outline* (`48×48px`, `stroke-width: 1.2px`) dalam format PNG transparan dan SVG. Karena garisnya berwarna solid di atas latar transparan, komponen `<GestureIcon>` dapat mewarnai ulang ikon secara dinamis menggunakan `tintColor` sesuai token `Colors.*`.

| Token (`HandGestureIcons.*`) | File (`assets/images/gestures/`) | Makna Gestur | Penggunaan di Aplikasi Presensi |
| :--- | :--- | :--- | :--- |
| `raiseHand` | `hand-gestures-01.png` | Angkat telapak tangan terbuka (✋) | Simbol utama **Hadir / Tunjuk Tangan Presensi** |
| `tapRing` | `hand-gestures-04.png` | Ketuk 1 jari dengan cincin riak | Ikon utama di tengah tombol `RippleCheckIn` ("TAP PRESENSI") |
| `swipeDown` | `hand-gestures-10.png` | Geser 1 jari ke bawah | Petunjuk *pull-to-refresh* jadwal & tutup *modal sheet* |
| `tapBurst` | `hand-gestures-25.png` | Ketuk 1 jari dengan kilau aktif | Indikator interaksi sentuh cepat (*tactile feedback*) |
| `peace` | `hand-gestures-26.png` | Jari *victory / peace* (✌️) | Ilustrasi ketika seluruh sesi hari ini telah dihadiri |
| `palmScan` | `hand-gestures-38.png` | Telapak tangan di dalam lingkaran | Ikon verifikasi identitas praktikan |
| `handTimer` | `hand-gestures-41.png` | Tangan menunjuk dengan ikon jam | Status sesi `NOT_STARTED` (*Menunggu Asisten Membuka Sesi*) |
| `handLocked` | `hand-gestures-42.png` | Tangan terbuka dengan ikon gembok | Status sesi `CLOSED` (*Sesi Presensi Sudah Ditutup*) |
| `thumbsUp` | `hand-gestures-43.png` | Jempol ke atas (👍) | Konfirmasi sukses presensi pada `FeedbackModal` |
| `handBlocked` | `hand-gestures-50.png` | Tangan dengan simbol larangan (🚫) | Validasi anti-double presensi / aksi ditolak |

**Indeks Katalog 50 Ikon `Hand-Gest` (`hand-gestures-01` s/d `50`):**
- `#01–#06`: Variasi telapak tangan terbuka (*open palm*, *backhand*, *point up*).
- `#07–#14`: Gestur geser arah (*swipe left/right/up/down* dengan 1 jari & telapak penuh).
- `#15–#19`: Gestur rotasi busur & *drag* titik (*rotate arc*, *orbital tap*).
- `#20`: Telapak tangan dicoret (*no-touch / disabled*).
- `#21–#24`: Gestur *pinch-to-zoom*, *spread*, dan *multi-directional pan*.
- `#25`: Ketuk jari dengan efek pancaran (*active tap burst*).
- `#26, #30, #31, #33, #45`: Gestur ekspresif (*crossed fingers*, *rock/horns*, *finger snap*, *peace sign*).
- `#27–#29, #34–#40`: Gestur *double-tap*, *long-press hold*, *palm scan*, *claw grab*, dan *four-finger swipe*.
- `#41–#44`: Gestur status kontekstual (`#41` *timer/wait*, `#42` *locked*, `#43` *thumbs-up*, `#44` *thumbs-down*).
- `#46–#50`: Gestur *spread palm*, *undo rotate*, *two-finger flick*, *point down*, dan `#50` *blocked/prohibited*.

---

## 3. Katalog Komponen Siap Pakai (`src/components/ui/`)

Semua komponen berikut dibuat generik, decoupled dari store/business logic, dan dapat langsung digunakan oleh anggota tim:

### 3.1 `Screen`
Wadah dasar halaman dengan dukungan safe-area otomatis (`react-native-safe-area-context`), ambient violet/indigo orbs, scroll, pull-to-refresh, dan padding bawah otomatis agar tidak tertutup floating navbar.
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
Kontainer dengan sudut melengkung dan 5 varian visual (`default`, `flat`, `hero`, `accent`, `glass`):
```tsx
import { Card } from '@/components/ui/Card';

// Varian Hero (Midnight Violet + Radial Spotlight Glow)
<Card variant="hero" padding="lg">
  <AppText variant="hero" color={Colors.textWhite}>Modul 1</AppText>
</Card>

// Varian Glass (Frosted BlurView + Specular Border)
<Card variant="glass" padding="md">
  <AppText variant="title">Kartu Kaca Buram</AppText>
</Card>

// Varian Standar (Surface putih gading dengan border dan soft shadow)
<Card variant="default" padding="md" onPress={handleClick}>
  <AppText variant="title">Sesi Struktur Data</AppText>
</Card>
```

### 3.4 `Badge`
Badge status presensi terstandarisasi dengan visual dot indikator aktif.
```tsx
import { Badge } from '@/components/ui/Badge';

<Badge label="DIBUKA" variant="open" showDot />
<Badge label="DITUTUP" variant="closed" />
<Badge label="SUDAH HADIR" variant="attended" />
<Badge label="BELUM DIMULAI" variant="waiting" />
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

### 3.8 `Icon` & `GestureIcon`
- `Icon`: Wrapper typed untuk icon cross-platform (Ionicons) dari `@expo/vector-icons`.
- `GestureIcon`: Wrapper typed untuk ikon gestur tangan dari paket **Hand-Gest** (`HandGestureIcons` di `@/constants/theme`) dengan dukungan pewarnaan dinamis (`tintColor`).

```tsx
import { GestureIcon, Icon } from '@/components/ui/Icon';
import { Colors } from '@/constants/theme';

// Ikon Ionicons standar
<Icon name="checkmark-circle" size={24} color={Colors.success} />

// Ikon gestur tangan Hand-Gest
<GestureIcon name="tapRing" size={28} color={Colors.primary} />
<GestureIcon name="handLocked" size={24} color={Colors.danger} />
```

### 3.9 `RippleCheckIn`
Tombol presensi interaktif dengan tiga cincin konsentris (*concentric ripple*) yang menggunakan `<GestureIcon name="tapRing" />` saat belum presensi dan berubah menjadi tanda centang hijau saat sudah tercatat hadir.
```tsx
import { RippleCheckIn } from '@/components/ui/RippleCheckIn';

<RippleCheckIn
  checkedIn={isAttended}
  onPress={handleCheckIn}
  gestureName="tapRing"
  helperText="Sentuh lingkaran untuk mencatat kehadiran"
/>
```

---

## 4. Pola Navigasi Compact Floating Pill (`src/components/ui/FloatingTabBar.tsx`)

Tab bar menggunakan komponen `FloatingTabBar` berlapis kaca buram (*frosted glass*) yang lebarnya otomatis mengikuti jumlah menu:
- **Posisi:** `position: 'absolute'`, `bottom: Math.max(insets.bottom, 16)`, `alignItems: 'center'`.
- **Lebar Kapsul:** Otomatis membungkus jumlah item menu (`flexDirection: 'row'`, `padding: 6`, `gap: 8`, `borderRadius: 9999`), tidak melebar penuh satu layar.
- **Indikator Tab Aktif:** Lingkaran ungu solid (`48×48`, `borderRadius: 24`, `backgroundColor: #5838DF`) dengan ikon putih di tengahnya.
- **Indikator Tab Tidak Aktif:** Lingkaran kaca semi-transparan (`48×48`, `backgroundColor: rgba(255,255,255,0.55)`) dengan ikon slate gelap (`#1E293B`).

---

## 5. UI Gallery Interaktif (`/ui-gallery`)

Aplikasi menyediakan rute khusus `src/app/ui-gallery.tsx` yang dapat diakses langsung oleh tim pengembang melalui tombol **"Buka UI Gallery"** di layar awal atau navigasi langsung ke `/ui-gallery`.
Di gallery ini tim dapat menguji langsung:
1. Seluruh palet warna swatch.
2. Interaksi *Concentric Ripple Check-in button* dengan ikon gestur `tapRing`.
3. Variasi Card (`hero`, `glass`, `default`, `accent`), Button, dan Badge.
4. Uji coba memicu Modal Feedback (sukses, error, warning).
5. Tampilan Empty State.
6. Pratinjau langsung seluruh aset `GradientMeshes`, `GradientShapes` (*Grads V2*), dan `GestureIcon` (*Hand-Gest*).
