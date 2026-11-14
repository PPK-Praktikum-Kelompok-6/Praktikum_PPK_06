import { PermitRequest } from '@/types/permit';
import { classifyPermitReason } from './ai';

/**
 * Service pengolahan data izin (SRS-IZIN-01, SRS-IZIN-02, SRS-AI-01).
 *
 * Menggunakan in-memory store dengan simulasi asynchronous delay
 * sehingga berfungsi mandiri maupun saat dihubungkan ke Cloud Firestore.
 */

export type PermitListener = () => void;
const listeners = new Set<PermitListener>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function subscribePermits(listener: PermitListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getStudentPermitsSync(studentId: string): PermitRequest[] {
  return permitStore.filter((p) => p.studentId === studentId);
}

export function getIncomingPermitsSync(): PermitRequest[] {
  return [...permitStore];
}

let permitStore: PermitRequest[] = [
  {
    id: 'permit-demo-01',
    sessionId: 'session-01',
    courseName: 'Praktikum Pemrograman Perangkat Keras',
    studentId: 'std-01',
    studentName: 'Ahmad Fauzi',
    studentNim: '24060124110001',
    reason: 'Mengalami demam tinggi dan diare sejak pagi hari, sedang rawat jalan di klinik kesehatan kampus.',
    submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: 'PENDING',
    aiClassification: {
      category: 'SAKIT',
      confidence: 0.94,
      urgencyLevel: 'TINGGI',
      summary: 'Mahasiswa sakit demam & diare dan sedang menjalani perawatan di klinik.',
      rawResponse: 'local-semantic-engine',
    },
  },
  {
    id: 'permit-demo-02',
    sessionId: 'session-02',
    courseName: 'Praktikum Sistem Terdistribusi',
    studentId: 'std-02',
    studentName: 'Siti Rahmawati',
    studentNim: '24060124110002',
    reason: 'Menjadi delegasi universitas dalam kompetisi hackathon nasional di Surabaya.',
    submittedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    status: 'APPROVED',
    aiClassification: {
      category: 'TUGAS_AKADEMIK',
      confidence: 0.92,
      urgencyLevel: 'SEDANG',
      summary: 'Mahasiswa mewakili kampus pada kompetisi hackathon nasional.',
      rawResponse: 'local-semantic-engine',
    },
    decisionNote: 'Izin diterima, harap kumpulkan surat tugas delegasi setelah kembali.',
    reviewedBy: 'Bayu Asisten',
    reviewedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

/**
 * 1. Mengajukan Izin Baru (SRS-IZIN-01 & SRS-AI-01)
 * Alur:
 * - Validasi input (minimal 10 karakter).
 * - Cek apakah praktikan sudah pernah mengajukan izin untuk sesi yang sama.
 * - Panggil classifyPermitReason() untuk mendapatkan rekomendasi AI.
 * - Simpan permohonan ke dalam store.
 */
export async function submitPermit(
  permitData: Omit<PermitRequest, 'id' | 'submittedAt' | 'status' | 'aiClassification'>
): Promise<{ success: boolean; permitId?: string; message: string; data?: PermitRequest }> {
  const trimmedReason = permitData.reason?.trim() || '';

  if (trimmedReason.length < 10) {
    return {
      success: false,
      message: 'Alasan izin terlalu pendek. Harap jelaskan alasan Anda minimal 10 karakter.',
    };
  }

  // Validasi: Praktikan tidak dapat mengajukan izin ganda untuk sesi yang sama
  const existing = permitStore.find(
    (p) =>
      p.sessionId === permitData.sessionId &&
      p.studentId === permitData.studentId &&
      p.status !== 'REJECTED'
  );

  if (existing) {
    return {
      success: false,
      message: 'Anda sudah pernah mengajukan izin untuk sesi praktikum ini.',
    };
  }

  // Panggil model AI untuk klasifikasi alasan
  const aiResult = await classifyPermitReason(trimmedReason);

  const newPermit: PermitRequest = {
    id: `permit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    sessionId: permitData.sessionId,
    courseName: permitData.courseName,
    studentId: permitData.studentId,
    studentName: permitData.studentName,
    studentNim: permitData.studentNim,
    reason: trimmedReason,
    submittedAt: new Date().toISOString(),
    status: 'PENDING',
    aiClassification: aiResult,
  };

  permitStore.unshift(newPermit);
  notifyListeners();

  return {
    success: true,
    permitId: newPermit.id,
    message: 'Permohonan izin berhasil diajukan dan sedang menunggu peninjauan asisten.',
    data: newPermit,
  };
}

/**
 * 2. Ambil Izin untuk Praktikan Tertentu (SRS-IZIN-01)
 */
export async function getStudentPermits(studentId: string): Promise<PermitRequest[]> {
  // Simulasi network latency pendek
  await new Promise((resolve) => setTimeout(resolve, 80));
  return permitStore.filter((p) => p.studentId === studentId);
}

/**
 * 3. Ambil Seluruh Izin Masuk untuk Asisten (SRS-IZIN-02)
 */
export async function getIncomingPermits(): Promise<PermitRequest[]> {
  await new Promise((resolve) => setTimeout(resolve, 80));
  return [...permitStore];
}

/**
 * 4. Keputusan Asisten: Menerima atau Menolak Izin (SRS-IZIN-02)
 */
export async function reviewPermit(
  permitId: string,
  decision: 'APPROVED' | 'REJECTED',
  assistantName: string,
  decisionNote?: string
): Promise<{ success: boolean; message: string }> {
  const targetIndex = permitStore.findIndex((p) => p.id === permitId);

  if (targetIndex === -1) {
    return {
      success: false,
      message: 'Permohonan izin tidak ditemukan.',
    };
  }

  permitStore[targetIndex] = {
    ...permitStore[targetIndex],
    status: decision,
    decisionNote: decisionNote?.trim() || undefined,
    reviewedBy: assistantName,
    reviewedAt: new Date().toISOString(),
  };

  notifyListeners();

  const actionText = decision === 'APPROVED' ? 'disetujui' : 'ditolak';

  return {
    success: true,
    message: `Permohonan izin berhasil ${actionText}.`,
  };
}

/**
 * Reset helper untuk keperluan testing unit/evaluasi.
 */
export function _resetPermitStore(initialData?: PermitRequest[]) {
  if (initialData) {
    permitStore = [...initialData];
  } else {
    permitStore = [];
  }
  notifyListeners();
}
