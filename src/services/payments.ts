import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore';

import { FineRecord, PaymentTransaction } from '@/types/fine';
import { db, isFirebaseConfigured } from './firebase';

const DEFAULT_PAYMENT_API_URL = 'http://localhost:3001';

export function getPaymentApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_PAYMENT_API_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  return DEFAULT_PAYMENT_API_URL;
}

/**
 * Memanggil backend server (`POST /api/payments/create`) untuk membuat transaksi
 * Midtrans Snap Sandbox tanpa pernah menyimpan MIDTRANS_SERVER_KEY di client (SRS-S4-05).
 */
export async function createPaymentTransaction(
  fineId: string,
  studentId: string
): Promise<{
  success: boolean;
  message: string;
  payment?: PaymentTransaction;
}> {
  if (!fineId || !studentId) {
    return {
      success: false,
      message: 'ID tagihan dan ID praktikan wajib disertakan.',
    };
  }

  const baseUrl = getPaymentApiBaseUrl();

  try {
    const response = await fetch(`${baseUrl}/api/payments/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ fineId, studentId }),
    });

    const data = (await response.json()) as {
      success?: boolean;
      message?: string;
      payment?: PaymentTransaction;
    };

    if (!response.ok || !data.success || !data.payment) {
      return {
        success: false,
        message:
          data.message ||
          `Gagal membuat transaksi pembayaran (HTTP ${response.status}).`,
      };
    }

    return {
      success: true,
      message: 'Transaksi Midtrans Snap berhasil dibuat.',
      payment: data.payment,
    };
  } catch (err: any) {
    return {
      success: false,
      message:
        err?.message ||
        `Tidak dapat terhubung ke server pembayaran (${baseUrl}). Pastikan backend berjalan.`,
    };
  }
}

/**
 * Meminta backend melakukan verifikasi status langsung ke Midtrans API (`POST /api/payments/sync/:orderId`)
 * sebagai backup apabila webhook tertunda.
 */
export async function syncPaymentStatus(
  orderId: string
): Promise<{ success: boolean; message: string }> {
  if (!orderId) {
    return { success: false, message: 'Order ID tidak valid.' };
  }

  const baseUrl = getPaymentApiBaseUrl();
  try {
    const response = await fetch(
      `${baseUrl}/api/payments/sync/${encodeURIComponent(orderId)}`,
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
      }
    );
    const data = (await response.json()) as {
      success?: boolean;
      message?: string;
    };
    return {
      success: Boolean(response.ok && data.success),
      message:
        data.message ||
        (response.ok
          ? 'Status pembayaran berhasil disinkronkan.'
          : `Gagal memeriksa status (HTTP ${response.status}).`),
    };
  } catch (err: any) {
    return {
      success: false,
      message:
        err?.message ||
        `Tidak dapat terhubung ke server pembayaran (${baseUrl}).`,
    };
  }
}

/**
 * Real-time listener daftar tagihan denda milik satu praktikan dari Cloud Firestore.
 */
export function subscribeStudentFines(
  studentId: string,
  onUpdate: (fines: FineRecord[]) => void
): () => void {
  if (!studentId || !isFirebaseConfigured) {
    onUpdate([]);
    return () => {};
  }

  try {
    const q = query(
      collection(db, 'fines'),
      where('studentId', '==', studentId)
    );
    return onSnapshot(
      q,
      (snap: QuerySnapshot<DocumentData>) => {
        const list: FineRecord[] = snap.docs.map(
          (d: QueryDocumentSnapshot<DocumentData>) => ({
            id: d.id,
            ...(d.data() as Omit<FineRecord, 'id'>),
          })
        );
        list.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        onUpdate(list);
      },
      (err) => {
        console.warn('Real-time student fines error:', err);
        onUpdate([]);
      }
    );
  } catch (err) {
    console.warn('Could not setup student fines listener:', err);
    onUpdate([]);
    return () => {};
  }
}

/**
 * Real-time listener satu dokumen tagihan denda (`fines/{fineId}`).
 */
export function subscribeFineDoc(
  fineId: string,
  onUpdate: (fine: FineRecord | null) => void
): () => void {
  if (!fineId || !isFirebaseConfigured) {
    onUpdate(null);
    return () => {};
  }

  try {
    return onSnapshot(
      doc(db, 'fines', fineId),
      (snap) => {
        if (!snap.exists()) {
          onUpdate(null);
          return;
        }
        onUpdate({
          id: snap.id,
          ...(snap.data() as Omit<FineRecord, 'id'>),
        });
      },
      (err) => {
        console.warn('Real-time fine doc error:', err);
        onUpdate(null);
      }
    );
  } catch {
    onUpdate(null);
    return () => {};
  }
}

/**
 * Real-time listener riwayat pembayaran persisten milik satu praktikan dari koleksi `payments` (SRS-S4-06).
 */
export function subscribePaymentHistory(
  studentId: string,
  onUpdate: (payments: PaymentTransaction[]) => void
): () => void {
  if (!studentId || !isFirebaseConfigured) {
    onUpdate([]);
    return () => {};
  }

  try {
    const q = query(
      collection(db, 'payments'),
      where('studentId', '==', studentId)
    );
    return onSnapshot(
      q,
      (snap: QuerySnapshot<DocumentData>) => {
        const list: PaymentTransaction[] = snap.docs.map(
          (d: QueryDocumentSnapshot<DocumentData>) => ({
            id: d.id,
            ...(d.data() as Omit<PaymentTransaction, 'id'>),
          })
        );
        list.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        onUpdate(list);
      },
      (err) => {
        console.warn('Real-time payment history error:', err);
        onUpdate([]);
      }
    );
  } catch (err) {
    console.warn('Could not setup payment history listener:', err);
    onUpdate([]);
    return () => {};
  }
}

/**
 * Real-time listener satu transaksi pembayaran (`payments/{paymentId}`) untuk memantau hasil webhook.
 */
export function subscribePaymentDoc(
  paymentId: string,
  onUpdate: (payment: PaymentTransaction | null) => void
): () => void {
  if (!paymentId || !isFirebaseConfigured) {
    onUpdate(null);
    return () => {};
  }

  try {
    return onSnapshot(
      doc(db, 'payments', paymentId),
      (snap) => {
        if (!snap.exists()) {
          onUpdate(null);
          return;
        }
        onUpdate({
          id: snap.id,
          ...(snap.data() as Omit<PaymentTransaction, 'id'>),
        });
      },
      (err) => {
        console.warn('Real-time payment doc error:', err);
        onUpdate(null);
      }
    );
  } catch {
    onUpdate(null);
    return () => {};
  }
}
