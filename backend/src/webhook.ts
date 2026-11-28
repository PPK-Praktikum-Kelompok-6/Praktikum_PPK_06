import crypto from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';

export interface MidtransWebhookPayload {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id?: string;
}

/**
 * Verifikasi SHA-512 signature_key resmi Midtrans:
 * SHA512(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY) === payload.signature_key
 */
export function verifyMidtransSignature(
  payload: MidtransWebhookPayload,
  serverKey: string
): boolean {
  if (
    !payload.order_id ||
    !payload.status_code ||
    !payload.gross_amount ||
    !payload.signature_key
  ) {
    return false;
  }

  const raw = `${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`;
  const expectedSignature = crypto
    .createHash('sha512')
    .update(raw)
    .digest('hex');

  return expectedSignature === payload.signature_key;
}

/**
 * Memproses webhook Midtrans, memperbarui status di `payments` dan `fines`,
 * serta mengirim notifikasi terarah ke koleksi `notifications`.
 * Catatan: Pembayaran denda TIDAK mengubah `AttendanceRecord.attendanceStatus`.
 */
export async function handleMidtransWebhook(
  db: Firestore,
  payload: MidtransWebhookPayload
): Promise<{ ok: boolean; status: number; message: string }> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    return {
      ok: false,
      status: 500,
      message: 'MIDTRANS_SERVER_KEY belum dikonfigurasi.',
    };
  }

  if (!verifyMidtransSignature(payload, serverKey)) {
    return {
      ok: false,
      status: 403,
      message: 'Invalid Midtrans signature_key.',
    };
  }

  const orderId = payload.order_id;
  const paymentRef = db.collection('payments').doc(orderId);
  const paymentSnap = await paymentRef.get();

  if (!paymentSnap.exists) {
    return {
      ok: false,
      status: 404,
      message: `Transaksi ${orderId} tidak ditemukan.`,
    };
  }

  const paymentData = paymentSnap.data() as {
    fineId: string;
    studentId: string;
    sessionId: string;
    sessionName: string;
    amount: number;
  };

  const txStatus = (payload.transaction_status || '').toLowerCase();
  const fraudStatus = (payload.fraud_status || '').toLowerCase();

  let nextPaymentStatus: 'pending' | 'success' | 'failed' = 'pending';
  let nextFineStatus: 'PENDING' | 'PAID' | 'UNPAID' = 'PENDING';

  if (
    txStatus === 'settlement' ||
    (txStatus === 'capture' && fraudStatus === 'accept')
  ) {
    nextPaymentStatus = 'success';
    nextFineStatus = 'PAID';
  } else if (txStatus === 'pending') {
    nextPaymentStatus = 'pending';
    nextFineStatus = 'PENDING';
  } else if (
    txStatus === 'deny' ||
    txStatus === 'cancel' ||
    txStatus === 'expire' ||
    txStatus === 'failure'
  ) {
    nextPaymentStatus = 'failed';
    nextFineStatus = 'UNPAID';
  }

  const nowIso = new Date().toISOString();

  await paymentRef.set(
    {
      status: nextPaymentStatus,
      paymentType: payload.payment_type || null,
      midtransTransactionId: payload.transaction_id || null,
      updatedAt: nowIso,
    },
    { merge: true }
  );

  const fineRef = db.collection('fines').doc(paymentData.fineId);
  const fineUpdate: Record<string, unknown> = {
    status: nextFineStatus,
    latestPaymentId: orderId,
  };
  if (nextFineStatus === 'PAID') {
    fineUpdate.paidAt = nowIso;
  }
  await fineRef.set(fineUpdate, { merge: true });

  // Kirim notifikasi terarah ke praktikan jika pembayaran selesai (success / failed)
  if (nextPaymentStatus === 'success' || nextPaymentStatus === 'failed') {
    const isSuccess = nextPaymentStatus === 'success';
    const notifId = `notif_pay_${orderId}_${nextPaymentStatus}`;
    const formattedAmount = `Rp ${Number(paymentData.amount || 0).toLocaleString('id-ID')}`;

    await db
      .collection('notifications')
      .doc(notifId)
      .set({
        id: notifId,
        type: isSuccess ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
        title: isSuccess
          ? 'Pembayaran Denda Berhasil'
          : 'Pembayaran Denda Gagal / Kedaluwarsa',
        body: isSuccess
          ? `Pembayaran denda ${paymentData.sessionName} sebesar ${formattedAmount} telah berhasil diverifikasi.`
          : `Pembayaran denda ${paymentData.sessionName} sebesar ${formattedAmount} gagal atau kedaluwarsa. Silakan coba bayar ulang.`,
        targetUserIds: [paymentData.studentId],
        route: isSuccess
          ? '/student/fines'
          : `/student/payment/${paymentData.fineId}`,
        sessionId: paymentData.sessionId,
        fineId: paymentData.fineId,
        paymentId: orderId,
        createdAt: nowIso,
        readBy: [],
      });
  }

  return {
    ok: true,
    status: 200,
    message: `Webhook ${orderId} diproses (${nextPaymentStatus}).`,
  };
}
