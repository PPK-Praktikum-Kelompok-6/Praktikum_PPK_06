import assert from 'assert';
import crypto from 'crypto';

import {
  MidtransWebhookPayload,
  verifyMidtransSignature,
} from '../src/webhook';

const TEST_SERVER_KEY = 'SB-Mid-server-TEST-KEY-12345';

function makeSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string
): string {
  return crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');
}

// 1. Valid SHA-512 signature harus diterima
const validPayload: MidtransWebhookPayload = {
  order_id: 'PAY-fine_session-1_std-1-1700000000',
  status_code: '200',
  gross_amount: '15000.00',
  signature_key: makeSignature(
    'PAY-fine_session-1_std-1-1700000000',
    '200',
    '15000.00',
    TEST_SERVER_KEY
  ),
  transaction_status: 'settlement',
  fraud_status: 'accept',
  payment_type: 'qris',
};

assert.strictEqual(
  verifyMidtransSignature(validPayload, TEST_SERVER_KEY),
  true,
  'Valid Midtrans signature_key seharusnya lolos verifikasi'
);

// 2. Signature palsu / dimodifikasi harus ditolak
const tamperedPayload: MidtransWebhookPayload = {
  ...validPayload,
  gross_amount: '100.00', // nominal diubah tanpa server key asli
};

assert.strictEqual(
  verifyMidtransSignature(tamperedPayload, TEST_SERVER_KEY),
  false,
  'Payload dengan nominal dimodifikasi seharusnya ditolak'
);

// 3. Signature kosong harus ditolak
assert.strictEqual(
  verifyMidtransSignature({ ...validPayload, signature_key: '' }, TEST_SERVER_KEY),
  false,
  'Signature kosong seharusnya ditolak'
);

console.log('✅ Semua uji verifikasi SHA-512 webhook Midtrans LULUS (3/3).');
