export type PermitStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type AICategory =
  | 'SAKIT'
  | 'KEDUKAAN_URGEN'
  | 'TUGAS_AKADEMIK'
  | 'KEPERLUAN_PRIBADI'
  | 'LAINNYA';

export interface AIClassificationResult {
  category: AICategory;
  confidence: number; // Skala 0.0 - 1.0
  urgencyLevel: 'TINGGI' | 'SEDANG' | 'RENDAH';
  summary: string; // Ringkasan singkat alasan oleh AI
  rawResponse?: string;
}

export interface PermitRequest {
  id: string;
  sessionId: string;
  courseName: string;
  studentId: string;
  studentName: string;
  studentNim: string;
  reason: string;
  submittedAt: string; // ISO String
  status: PermitStatus;
  aiClassification?: AIClassificationResult; // Diisi oleh model AI
  decisionNote?: string; // Catatan manual asisten
  reviewedBy?: string; // Nama / ID asisten
  reviewedAt?: string;
}
