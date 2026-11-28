import crypto from 'crypto';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

import {
  createMidtransSnapTransaction,
  getMidtransTransactionStatus,
} from './midtrans';
import { handleMidtransWebhook, MidtransWebhookPayload } from './webhook';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Inisialisasi Firebase Admin SDK menggunakan serviceAccountKey.json
const serviceAccountPath = path.resolve(
  __dirname,
  '..',
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json'
);

if (!admin.apps.length) {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(
      fs.readFileSync(serviceAccountPath, 'utf-8')
    );
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    console.warn(
      `[WARN] File serviceAccountKey.json tidak ditemukan di ${serviceAccountPath}. Menggunakan default credentials.`
    );
    admin.initializeApp();
  }
}

const db = admin.firestore();

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'ppk-payment-backend',
    midtransConfigured: Boolean(process.env.MIDTRANS_SERVER_KEY),
  });
});

/**
 * POST /api/payments/create
 * Menerima { fineId, studentId } dari aplikasi mobile, memvalidasi tagihan di Firestore,
 * membuat transaksi di Midtrans Snap Sandbox, dan menyimpan transaksi awal (`pending`).
 */
app.post('/api/payments/create', async (req, res) => {
  try {
    const { fineId, studentId } = req.body as {
      fineId?: string;
      studentId?: string;
    };

    if (!fineId || !studentId) {
      res.status(400).json({
        success: false,
        message: 'fineId dan studentId wajib disertakan.',
      });
      return;
    }

    const fineRef = db.collection('fines').doc(fineId);
    const fineSnap = await fineRef.get();

    if (!fineSnap.exists) {
      res.status(404).json({
        success: false,
        message: 'Tagihan denda tidak ditemukan.',
      });
      return;
    }

    const fine = fineSnap.data() as {
      studentId: string;
      studentName: string;
      studentNim: string;
      sessionId: string;
      sessionName: string;
      amount: number;
      status: string;
      createdAt: string;
    };

    if (fine.studentId !== studentId) {
      res.status(403).json({
        success: false,
        message: 'Anda tidak berhak membayar tagihan milik praktikan lain.',
      });
      return;
    }

    if (fine.status === 'PAID' || fine.status === 'WAIVED') {
      res.status(400).json({
        success: false,
        message: 'Tagihan denda ini sudah lunas atau dibebaskan.',
      });
      return;
    }

    const orderId = `PAY-${fineId}-${Date.now()}`;
    const snap = await createMidtransSnapTransaction({
      orderId,
      grossAmount: fine.amount,
      itemName: `Denda Keterlambatan: ${fine.sessionName}`,
      studentName: fine.studentName,
      studentNim: fine.studentNim,
    });

    const nowIso = new Date().toISOString();
    const paymentRecord = {
      id: orderId,
      fineId,
      studentId,
      sessionId: fine.sessionId,
      sessionName: fine.sessionName,
      fineDate: fine.createdAt,
      amount: fine.amount,
      status: 'pending',
      snapToken: snap.token,
      snapRedirectUrl: snap.redirect_url,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await db.collection('payments').doc(orderId).set(paymentRecord);
    await fineRef.set(
      {
        status: 'PENDING',
        latestPaymentId: orderId,
      },
      { merge: true }
    );

    res.json({
      success: true,
      payment: paymentRecord,
    });
  } catch (err: any) {
    console.error('Error /api/payments/create:', err);
    res.status(500).json({
      success: false,
      message: err?.message || 'Gagal membuat transaksi pembayaran.',
    });
  }
});

/**
 * POST /api/payments/webhook
 * Endpoint resmi penerima notifikasi HTTP dari Midtrans Sandbox.
 */
app.post('/api/payments/webhook', async (req, res) => {
  try {
    const result = await handleMidtransWebhook(
      db,
      req.body as MidtransWebhookPayload
    );
    res.status(result.status).json(result);
  } catch (err: any) {
    console.error('Error /api/payments/webhook:', err);
    res.status(500).json({
      ok: false,
      message: err?.message || 'Internal server error saat memproses webhook.',
    });
  }
});

/**
 * POST /api/payments/sync/:orderId
 * Backup verifikasi server-to-server langsung ke Midtrans Status API apabila webhook tertunda.
 */
app.post('/api/payments/sync/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!orderId || !serverKey) {
      res.status(400).json({
        success: false,
        message: 'orderId atau MIDTRANS_SERVER_KEY tidak valid.',
      });
      return;
    }

    const midtransStatus = await getMidtransTransactionStatus(orderId);
    const computedSig =
      midtransStatus.signature_key ||
      crypto
        .createHash('sha512')
        .update(
          `${midtransStatus.order_id}${midtransStatus.status_code}${midtransStatus.gross_amount}${serverKey}`
        )
        .digest('hex');

    const result = await handleMidtransWebhook(db, {
      order_id: midtransStatus.order_id,
      status_code: midtransStatus.status_code,
      gross_amount: midtransStatus.gross_amount,
      signature_key: computedSig,
      transaction_status: midtransStatus.transaction_status,
      fraud_status: midtransStatus.fraud_status,
      payment_type: midtransStatus.payment_type,
      transaction_id: midtransStatus.transaction_id,
    });

    res.status(result.status).json({
      success: result.ok,
      message: result.message,
      transactionStatus: midtransStatus.transaction_status,
    });
  } catch (err: any) {
    console.error('Error /api/payments/sync:', err);
    res.status(500).json({
      success: false,
      message: err?.message || 'Gagal menyinkronkan status pembayaran.',
    });
  }
});

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
  console.log(
    `[ppk-payment-backend] Server berjalan di http://localhost:${PORT}`
  );
});
