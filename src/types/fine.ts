export type FineStatus = 'UNPAID' | 'PENDING' | 'PAID' | 'WAIVED';
export type PaymentStatus = 'pending' | 'success' | 'failed';

export interface FineRecord {
  id: string; // Deterministik: `fine_${sessionId}_${studentId}` (maksimal 1 tagihan per kejadian)
  studentId: string;
  studentName: string;
  studentNim: string;
  sessionId: string;
  sessionName: string;
  classCode: string;
  labId?: string;
  attendanceId: string;
  lateMinutes: number;
  amount: number; // Nominal tetap (IDR)
  status: FineStatus;
  createdAt: string; // ISO string
  paidAt?: string;
  latestPaymentId?: string;
}

export interface PaymentTransaction {
  id: string; // order_id Midtrans, misal: `PAY-${fineId}-${timestamp}`
  fineId: string;
  studentId: string;
  sessionId: string;
  sessionName: string;
  fineDate: string; // Tanggal tagihan (dari FineRecord.createdAt)
  amount: number;
  status: PaymentStatus; // 'pending' | 'success' | 'failed' (HANYA diverifikasi backend webhook)
  paymentType?: string; // e.g. 'gopay', 'bank_transfer', 'qris'
  snapToken?: string;
  snapRedirectUrl?: string;
  midtransTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}
